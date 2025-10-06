// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import formidable from "formidable";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req, res) {
  const { postId } = req.query;

  if (!ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "kitchen-connect");

  try {
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
        authorId: post.authorId ?? null,
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
          // Consider local uploads live under /public or /uploads - attempt to resolve
          const possiblePath = post.photo.startsWith("/") ? post.photo.slice(1) : post.photo;
          const filePath = path.join(process.cwd(), possiblePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
          console.warn("Could not delete post photo file:", err);
          // Continue deletion even if file removal fails
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

      // Support multipart/form-data (file upload) or JSON
      let title;
      let content;
      let photo;

      const contentType = (req.headers["content-type"] || "").toLowerCase();
      if (contentType.includes("multipart/form-data")) {
        // parse with formidable
        const form = new formidable.IncomingForm({ multiples: false });
        const parsed = await new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve({ fields, files });
          });
        });

        title = parsed.fields.title;
        content = parsed.fields.content;
        photo = parsed.fields.photo || undefined;

        if (parsed.files && parsed.files.photo) {
          const file = parsed.files.photo;
          const ext = path.extname(file.originalFilename || file.newFilename || file.name || "") || ".jpg";
          const fileName = `${uuidv4()}${ext}`;
          const dest = path.join(uploadDir, fileName);
          try {
            fs.renameSync(file.filepath, dest);
            photo = `/uploads/${fileName}`;
          } catch (e) {
            console.error("Failed to move uploaded file", e);
          }
        }
      } else {
        // JSON body
        title = req.body.title;
        content = req.body.content;
        photo = req.body.photo;
      }

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

      if (photo !== undefined) {
        // If replacing an existing local photo, delete old file
        if (post.photo && typeof post.photo === "string" && post.photo !== photo) {
          try {
            const possiblePath = post.photo.startsWith("/") ? post.photo.slice(1) : post.photo;
            const filePath = path.join(process.cwd(), possiblePath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch (err) {
            console.warn("Could not delete old photo file:", err);
          }
        }
        updateFields.photo = photo;
      }

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
