// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  const { postId } = req.query;

  if (!ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");

    if (req.method === "GET") {
      const post = await db
        .collection("posts")
        .findOne({ _id: new ObjectId(postId) });

      if (!post) return res.status(404).json({ message: "Post not found" });

      const data = {
        id: String(post._id),
        title: post.title ?? "",
        content: post.content ?? "",
        photo: post.photo ?? null,
        authorId: post.authorId ?? post.userId ?? null,
        createdAt: post.createdAt ?? null,
      };

      return res.status(200).json(data);
    }

    if (req.method === "DELETE") {
      // Verify token
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const post = await db
        .collection("posts")
        .findOne({ _id: new ObjectId(postId) });

      if (!post) return res.status(404).json({ message: "Post not found" });

      // Only author can delete
      if (!post.authorId || String(post.authorId) !== String(decoded.userId)) {
        return res.status(403).json({ message: "Forbidden: not post owner" });
      }

      // If post has a local photo path, attempt to delete the file
      if (post.photo && typeof post.photo === "string") {
        try {
          const possiblePath = post.photo.startsWith("/") ? post.photo.slice(1) : post.photo;
          const filePath = path.join(process.cwd(), possiblePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn("Could not delete post photo file:", err);
        }
      }

      await db.collection("posts").deleteOne({ _id: new ObjectId(postId) });

      return res.status(200).json({ message: "Post deleted" });
    }

    if (req.method === "PUT") {
      // Verify token
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ message: "Unauthorized" });

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const post = await db
        .collection("posts")
        .findOne({ _id: new ObjectId(postId) });

      if (!post) return res.status(404).json({ message: "Post not found" });

      // Only author can edit
      if (!post.authorId || String(post.authorId) !== String(decoded.userId)) {
        return res.status(403).json({ message: "Forbidden: not post owner" });
      }

      const { title, content, photo } = req.body;

      // Validate mandatory fields
      if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!content || typeof content !== "string" || content.trim() === "") {
        return res.status(400).json({ message: "Content is required" });
      }

      const updateFields = {
        title: title.trim(),
        content: content.trim(),
        updatedAt: new Date(),
      };

      if (photo !== undefined) updateFields.photo = photo;

      await db.collection("posts").updateOne({ _id: new ObjectId(postId) }, { $set: updateFields });

      const updatedPost = await db.collection("posts").findOne({ _id: new ObjectId(postId) });

      return res.status(200).json({
        id: String(updatedPost._id),
        title: updatedPost.title,
        content: updatedPost.content,
        photo: updatedPost.photo || null,
        authorId: updatedPost.authorId,
        updatedAt: updatedPost.updatedAt || null,
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (e) {
    console.error("[POSTS /api/posts/:postId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
