// pages/api/posts/[postId]/isLike.js
// PURPOSE: toggle like per user (1 per user) and return { isLiked, likeCount }

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { postId } = req.query;

  // Validate postId
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  // GET (status) or POST (toggle) only
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const posts = db.collection("posts");
    const users = db.collection("users");

    // Fetch current post like info
    const proj = { projection: { likedUsers: 1, likeCount: 1, title: 1 } };
    const post = await posts.findOne({ _id: new ObjectId(postId) }, proj);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Helper for safe likeCount
    const computeCount = (p) => {
      if (typeof p.likeCount === "number") return p.likeCount;
      if (Array.isArray(p.likedUsers)) return p.likedUsers.length;
      return 0;
    };

    // Extract user (optional for GET, required for POST)
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

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
        // For GET, invalid token just means we can't compute isLiked.
        // For POST we'll handle 401 below.
        if (req.method === "POST") {
          return res
            .status(401)
            .json({ message: "Unauthorized: Invalid or expired token" });
        }
      }
    }

    // GET: return current status
    if (req.method === "GET") {
      const likedUsers = Array.isArray(post.likedUsers) ? post.likedUsers : [];
      // Support both ObjectId and string in likedUsers (compat)
      const isLiked =
        !!userObjectId &&
        likedUsers.some((u) => {
          try {
            // match if stored as ObjectId
            if (u instanceof ObjectId) return u.equals(userObjectId);
            // or as string
            return String(u) === String(userObjectId);
          } catch {
            return false;
          }
        });

      return res.status(200).json({
        isLiked,
        likeCount: computeCount(post),
      });
    }

    // POST: toggle like (auth required)
    if (!userObjectId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const likedUsers = Array.isArray(post.likedUsers) ? post.likedUsers : [];
    const already = likedUsers.some((u) => {
      try {
        if (u instanceof ObjectId) return u.equals(userObjectId);
        return String(u) === String(userObjectId);
      } catch {
        return false;
      }
    });

    if (already) {
      // Unlike: remove only this user and decrement
      await posts.updateOne(
        { _id: post._id },
        { $pull: { likedUsers: userObjectId }, $inc: { likeCount: -1 } }
      );
    } else {
      // Like: add only once and increment
      await posts.updateOne(
        { _id: post._id },
        { $addToSet: { likedUsers: userObjectId }, $inc: { likeCount: 1 } }
      );
    }

    // Record to user's history (like / unlike) – optional but mirrors favorite
    try {
      const ensure = await users.findOne(
        { _id: userObjectId },
        { projection: { history: 1 } }
      );
      if (!Array.isArray(ensure?.history)) {
        await users.updateOne({ _id: userObjectId }, { $set: { history: [] } });
      }

      const title = post?.title || null;
      await users.updateOne(
        { _id: userObjectId },
        {
          $push: {
            history: {
              $each: [
                {
                  type: already ? "unlike" : "like",
                  postId: post._id,
                  text: null,
                  title,
                  createdAt: new Date(),
                },
              ],
              $position: 0,
              $slice: 200,
            },
          },
        }
      );
    } catch (e) {
      console.warn("Failed to record like/unlike in history", e);
    }

    // Return fresh state
    const updated = await posts.findOne({ _id: post._id }, proj);
    const nowLiked = (Array.isArray(updated.likedUsers) ? updated.likedUsers : []).some((u) => {
      try {
        if (u instanceof ObjectId) return u.equals(userObjectId);
        return String(u) === String(userObjectId);
      } catch {
        return false;
      }
    });

    return res.status(200).json({
      isLiked: nowLiked,
      likeCount: computeCount(updated),
    });
  } catch (error) {
    console.error("[isLike] API Error", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}