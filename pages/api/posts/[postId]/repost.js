// pages/api/posts/[postId]/repost.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // --- Auth ---
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }

    const { postId } = req.query;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const posts = db.collection("posts");

    // Build safe OR
    const or = [];
    if (ObjectId.isValid(postId)) or.push({ _id: new ObjectId(postId) });
    or.push({ id: String(postId) });

    const query = or.length > 0 ? { $or: or } : { id: String(postId) };

    // 1) Find original post
    const original = await posts.findOne(query);
    if (!original) {
      return res.status(404).json({ message: "Original post not found" });
    }

    // 2) Prevent duplicate repost by same user
    const authorId = String(decoded.userId);
    const already = await posts.findOne({
      type: "repost",
      originalPostId: original._id,
      authorId: authorId,
    });
    if (already) {
      return res.status(409).json({ message: "Already reposted" });
    }

    // 3) Create repost (DENORMALIZE original author + ids)
    const now = new Date();
    const newDoc = {
      // Copied fields
      title: original.title ?? "",
      content: original.content ?? "",
      photo: original.photo ?? null,

      // Repost metadata
      type: "repost",
      authorId: authorId,                 // current user is reposter
      createdAt: now,
      likeCount: 0,

      // Denormalized original references (for UI)
      originalPostId: original._id,       // ObjectId reference
      originalPostIdStr: String(original._id), // handy string for links
      // Optionally keep a lightweight snapshot for display
      originalTitle: original.title ?? "",
    };

    const insert = await posts.insertOne(newDoc);

    return res.status(201).json({
      message: "Reposted",
      id: String(insert.insertedId),
      originalId: String(original._id),
    });
  } catch (err) {
    console.error("[POST /api/posts/:postId/repost] error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}