// pages/api/posts/[postId]/comments.js (Get Comment List: GET)

import clientPromise from "../../../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("kitchen-connect");

  // Get postId from the parameter
  const { postId } = req.query;

  if (req.method === "GET") {
    if (!postId) {
      return res.status(400).json({ message: "postId is required." });
    }

    let postObjectId;
    try {
      postObjectId = new ObjectId(postId);
    } catch (e) {
      return res.status(400).json({ message: "Invalid postId format." });
    }

    try {
      // MongoDB Aggregation: Find comments linked to postId and join with user data
      const comments = await db
        .collection("comments")
        .aggregate([
          { $match: { postId: postObjectId } },
          { $sort: { createdAt: 1 } }, // Sort by oldest first
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "authorInfo",
            },
          },
          {
            $unwind: { path: "$authorInfo", preserveNullAndEmptyArrays: true },
          },
          {
            $project: {
              _id: { $toString: "$_id" },
              text: 1,
              createdAt: 1,
              updatedAt: 1,
              authorInfo: {
                _id: { $toString: "$authorInfo._id" }, // Author ID for client-side check
                username: { $ifNull: ["$authorInfo.username", "Anonymous"] },
              },
            },
          },
        ])
        .toArray();

      // Return data in the { data: [] } structure expected by SWR
      return res.status(200).json({ data: comments });
    } catch (error) {
      console.error("Comment fetch error:", error);
      return res.status(500).json({ message: "Failed to fetch comments." });
    }
  } else {
    res
      .status(405)
      .json({ message: "Method Not Allowed. Only GET is allowed." });
  }
}
