// pages/api/posts/[postId]/repost.js
// PURPOSE: Toggle repost per user. When enabling, actually create a new post that references the original.
// - GET  -> return { isReposted, repostCount } (token optional)
// - POST -> toggle (token required), prevent self-repost

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";


function pickFields(src, keys) {
  const out = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}


export default async function handler(req, res) {
  
  const { postId } = req.query;

  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const posts = db.collection("posts");
    const users = db.collection("users");

    const proj = {
      projection: {
        repostUsers: 1, repostCount: 1,
        title: 1, content: 1,
        
        photo: 1, photoUrl: 1, images: 1,
        
        difficulty: 1, timeMax: 1, timeMin: 1,
        dietary: 1, tags: 1, category: 1, cuisine: 1,
        
        ingredients: 1, include: 1, exclude: 1,
        
        servings: 1, yields: 1,
        authorId: 1, createdAt: 1
      }
    };
    const original = await posts.findOne({ _id: new ObjectId(postId) }, proj);
    if (!original) return res.status(404).json({ message: "Post not found" });

    const computeCount = (p) => {
      if (typeof p.repostCount === "number") return p.repostCount;
      if (Array.isArray(p.repostUsers)) return p.repostUsers.length;
      return 0;
    };

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    let userId = null;
    let userObjectId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        if (userId && ObjectId.isValid(userId)) {
          userObjectId = new ObjectId(userId);
        }
      } catch (e) {
        if (req.method === "POST") {
          return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
        }
      }
    }

    // ---- GET: status only ----
    if (req.method === "GET") {
      const repostUsers = Array.isArray(original.repostUsers) ? original.repostUsers : [];
      const isReposted = !!userObjectId && repostUsers.some((u) => {
        try {
          if (u instanceof ObjectId) return u.equals(userObjectId);
          return String(u) === String(userObjectId);
        } catch { return false; }
      });

      return res.status(200).json({
        isReposted,
        repostCount: computeCount(original),
      });
    }

    // ---- POST: toggle ----
    if (!userObjectId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 1) Prevent self-repost
    const originalAuthorId = original.authorId ? String(original.authorId) : null;
    if (originalAuthorId && String(originalAuthorId) === String(userId)) {
      return res.status(400).json({ message: "You cannot repost your own post." });
    }

    // 2) Toggle logic
    const repostUsers = Array.isArray(original.repostUsers) ? original.repostUsers : [];
    const already = repostUsers.some((u) => {
      try {
        if (u instanceof ObjectId) return u.equals(userObjectId);
        return String(u) === String(userObjectId);
      } catch { return false; }
    });

    if (already) {
      // UNREPOST: pull user, dec count, delete the user's reposted copy
      await posts.updateOne(
        { _id: original._id },
        { $pull: { repostUsers: userObjectId }, $inc: { repostCount: -1 } }
      );

      await posts.deleteOne({
        authorId: userId,                 // repost doc owner is current user
        originalPostId: original._id,     // reference back to original
        isRepost: true,
      });

      // (optional) history
      try {
        await ensureHistoryArray(users, userObjectId);
        await users.updateOne(
          { _id: userObjectId },
          {
            $push: {
              history: {
                $each: [{
                  type: "unrepost",
                  postId: original._id,
                  title: original.title || null,
                  text: null,
                  createdAt: new Date(),
                }],
                $position: 0,
                $slice: 200,
              },
            },
          }
        );
      } catch (e) {
        console.warn("Failed to record unrepost in history", e);
      }
    } else {
      // REPOST: add user, inc count, insert a new post copying essentials
      await posts.updateOne(
        { _id: original._id },
        { $addToSet: { repostUsers: userObjectId }, $inc: { repostCount: 1 } }
      );
      const carried = pickFields(original, [
        "photo", "photoUrl", "images",
        "difficulty", "timeMax", "timeMin",
        "dietary", "tags", "category", "cuisine",
        "ingredients", "include", "exclude",
        "servings", "yields"
      ]);
      // Create a new "repost" document
      const repostDoc = {
        title: original.title ? `Repost: ${original.title}` : "Repost",
        content: original.content || "",
        photo: original.photo || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: userId,                 // the re-poster is the author of the new doc
        originalPostId: original._id,     // reference to original
        isRepost: true,
        ...carried
       
      };

      // Avoid duplicate repost docs for same user+original (idempotency guard)
      const existingRepost = await posts.findOne({
        authorId: userId,
        originalPostId: original._id,
        isRepost: true,
      }, { projection: { _id: 1 } });

      if (!existingRepost) {
        await posts.insertOne(repostDoc);
      }

      // (optional) history
      try {
        await ensureHistoryArray(users, userObjectId);
        await users.updateOne(
          { _id: userObjectId },
          {
            $push: {
              history: {
                $each: [{
                  type: "repost",
                  postId: original._id,
                  title: original.title || null,
                  text: null,
                  createdAt: new Date(),
                }],
                $position: 0,
                $slice: 200,
              },
            },
          }
        );
      } catch (e) {
        console.warn("Failed to record repost in history", e);
      }
    }

    // 3) Return fresh status
    const updated = await posts.findOne({ _id: original._id }, proj);
    const nowReposted = (Array.isArray(updated.repostUsers) ? updated.repostUsers : []).some((u) => {
      try {
        if (u instanceof ObjectId) return u.equals(userObjectId);
        return String(u) === String(userObjectId);
      } catch { return false; }
    });

    return res.status(200).json({
      isReposted: nowReposted,
      repostCount: computeCount(updated),
    });
  } catch (error) {
    console.error("[repost] API Error", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function ensureHistoryArray(users, userObjectId) {
  const u = await users.findOne({ _id: userObjectId }, { projection: { history: 1 } });
  if (!Array.isArray(u?.history)) {
    await users.updateOne({ _id: userObjectId }, { $set: { history: [] } });
  }
}