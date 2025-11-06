// pages/api/posts/[postId]/favorite.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Require Bearer token
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId);

    const { postId } = req.query;
    if (!postId) return res.status(400).json({ message: "Missing postId" });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Ensure the post exists (optional but safer)
    const exists = await db.collection("posts").findOne({
      $or: [
        { _id: ObjectId.isValid(postId) ? new ObjectId(postId) : undefined },
        { id: postId },
      ].filter(Boolean),
    });
    if (!exists) return res.status(404).json({ message: "Post not found" });

    const favorites = db.collection("favorites");

    // Create a unique compound index once (idempotent)
    await favorites.createIndex({ userId: 1, postId: 1 }, { unique: true });

    // Toggle favorite
    const key = { userId, postId: String(exists._id) };
    const found = await favorites.findOne(key);

    if (found) {
      // Unfavorite
      await favorites.deleteOne(key);
      return res.status(200).json({ isFavorited: false });
    } else {
      // Favorite
      await favorites.insertOne({ ...key, createdAt: new Date() });
      return res.status(200).json({ isFavorited: true });
    }
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
    console.error("[POST /api/posts/:postId/favorite] error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}