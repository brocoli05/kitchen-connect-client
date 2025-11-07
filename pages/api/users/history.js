// pages/api/users/history.js
// PURPOSE: record and retrieve user activity history stored inside users.history array

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  // Allow GET, POST, DELETE
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  const client = await clientPromise;
  const db = client.db("kitchen-connect");
  const userObjectId = new ObjectId(decoded.userId);

  if (req.method === "POST") {
    // Record an event into users.history (push to front, keep max 200 entries)
    const { type, postId, commentId, text, title } = req.body || {};
    if (!type || !postId) {
      return res.status(400).json({ message: "type and postId are required" });
    }

    // validate ids to avoid ObjectId construction errors
    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }
    if (commentId && !ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid commentId" });
    }

    try {
      const event = {
        type,
        postId: new ObjectId(postId),
        commentId: commentId ? new ObjectId(commentId) : null,
        text: text || null,
        title: title || null,
        createdAt: new Date(),
      };

      // For 'view' events, remove any existing 'view' entries for the same post
      // and push the new one in a single atomic update to avoid race conditions
      // that could create duplicate entries when requests happen concurrently.
      const usersColl = db.collection("users");

      try {
        const me = await usersColl.findOne({ _id: userObjectId }, { projection: { history: 1 } });
        if (!Array.isArray(me?.history)) {
          await usersColl.updateOne({ _id: userObjectId }, { $set: { history: [] } });
        }
      } catch (e) {
        
        console.warn("Failed to ensure history array exists for user", e);
      }

      // If title is not provided and type references a post, try to fetch title from posts
      if (!event.title) {
        try {
          const post = await db.collection("posts").findOne(
            { _id: event.postId },
            { projection: { title: 1 } }
          );
          if (post && post.title) event.title = post.title;
        } catch (e) {
          // ignore post title fetch failure
        }
      }

      // Push the event to the front of the history array and cap at 200 entries.
      // If this is a view event, perform a single update that pulls previous
      // view entries for the same post and then pushes the new one atomically.
      if (type === "view") {
        try {
          // Use an update pipeline to atomically remove any previous 'view'
          // for the same post and prepend the new event without causing
          // multiple operations on the same array field (which can conflict).
          await usersColl.updateOne(
            { _id: userObjectId },
            [
              {
                $set: {
                  history: {
                    $let: {
                      vars: {
                        filtered: {
                          $filter: {
                            input: "$history",
                            as: "h",
                            cond: {
                              $not: {
                                $and: [
                                  { $eq: ["$$h.type", "view"] },
                                  { $eq: ["$$h.postId", event.postId] },
                                ],
                              },
                            },
                          },
                        },
                      },
                      in: { $slice: [{ $concatArrays: [[event], "$$filtered"] }, 200] },
                    },
                  },
                },
              },
            ]
          );
        } catch (e) {
          console.warn("Failed to update view entry via pipeline, falling back", e);
          // fallback to safe separate operations
          try {
            await usersColl.updateOne({ _id: userObjectId }, { $pull: { history: { type: "view", postId: event.postId } } });
            await usersColl.updateOne(
              { _id: userObjectId },
              { $push: { history: { $each: [event], $position: 0, $slice: 200 } } }
            );
          } catch (e2) {
            console.error("Fallback history push failed", e2);
          }
        }
      } else {
        // Non-view events: just push to front and cap
        await usersColl.updateOne(
          { _id: userObjectId },
          { $push: { history: { $each: [event], $position: 0, $slice: 200 } } }
        );
      }

      return res.status(201).json({ message: "Recorded" });
    } catch (error) {
      console.error("History POST error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  // DELETE: clear the user's history (all entries)
  if (req.method === "DELETE") {
    try {
      await db.collection("users").updateOne({ _id: userObjectId }, { $set: { history: [] } });
      return res.status(200).json({ message: "History cleared" });
    } catch (error) {
      console.error("History DELETE error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // GET: fetch paginated history for current user
  if (req.method === "GET") {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, parseInt(req.query.limit || "20", 10));
    const typeFilter = req.query.type || null;
    const q = req.query.q ? String(req.query.q).trim() : null;

    const skip = (page - 1) * limit;

    try {
      // Aggregation: unwind history, filter, sort, paginate, and return total via facet
      const matchStage = { $match: { _id: userObjectId } };
      const projectStage = { $project: { history: 1 } };
      const unwindStage = { $unwind: "$history" };
      const replaceRoot = { $replaceRoot: { newRoot: "$history" } };

      const filters = [];
      if (typeFilter) filters.push({ type: typeFilter });
      if (q) {
        const regex = new RegExp(q, "i");
        filters.push({ $or: [{ title: regex }, { text: regex }] });
      }

      const pipeline = [matchStage, projectStage, unwindStage, replaceRoot];
      if (filters.length) pipeline.push({ $match: { $and: filters } });
      pipeline.push({ $sort: { createdAt: -1 } });

      pipeline.push({
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      });

      const agg = await db.collection("users").aggregate(pipeline).toArray();
      const metadata = (agg[0] && agg[0].metadata && agg[0].metadata[0]) || { total: 0 };
      const items = (agg[0] && agg[0].data) || [];

      return res.status(200).json({ items, total: metadata.total || 0, page, totalPages: Math.ceil((metadata.total || 0) / limit) });
    } catch (error) {
      console.error("History GET error", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}