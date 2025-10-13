// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import formidable from 'formidable';

// Disable body parsing for FormData when editing with images
export const config = {
  api: {
    bodyParser: false,
  },
};

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

      let title, content, photoFile;

      // Helper: promisify formidable.parse (safer across versions)
      const parseForm = (form, req) =>
        new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve([fields, files]);
          });
        });

      // Check if request has FormData (multipart) for image upload
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle FormData with image upload
        const form = formidable({
          maxFileSize: 5 * 1024 * 1024, // 5MB limit
          allowEmptyFiles: false,
          filter: ({ mimetype }) => !mimetype || mimetype.includes('image'),
        });

        const [fields, files] = await parseForm(form, req);

        title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        content = Array.isArray(fields.content) ? fields.content[0] : fields.content;
        photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
      } else {
        // Handle regular JSON request: bodyParser is disabled for this route,
        // so read the raw request body and parse JSON manually.
        const raw = await new Promise((resolve, reject) => {
          let data = "";
          req.on("data", (chunk) => (data += chunk));
          req.on("end", () => resolve(data));
          req.on("error", (err) => reject(err));
        });

        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (err) {
          return res.status(400).json({ message: "Invalid JSON body" });
        }

        const { title: reqTitle, content: reqContent } = parsed;
        title = reqTitle;
        content = reqContent;
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

      // Handle photo upload if present
      if (photoFile) {
        try {
          // Create uploads directory
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Generate unique filename
          const fileExtension = path.extname(photoFile.originalFilename || '');
          const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`;
          const newPath = path.join(uploadsDir, uniqueFilename);

          // Move file to uploads directory
          fs.copyFileSync(photoFile.filepath, newPath);
          
          // Clean up temp file
          fs.unlinkSync(photoFile.filepath);

          // Store relative path in database
          updateFields.photo = `/uploads/${uniqueFilename}`;

          // Delete old photo if it exists
          if (post.photo && typeof post.photo === "string") {
            try {
              const oldPhotoPath = path.join(process.cwd(), 'public', post.photo);
              if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
              }
            } catch (err) {
              console.warn("Could not delete old photo file:", err);
            }
          }
        } catch (error) {
          console.error('Error handling photo upload:', error);
          return res.status(500).json({ message: "Error uploading photo" });
        }
      }

      await db.collection("posts").updateOne({ _id: new ObjectId(postId) }, { $set: updateFields });

      const updatedPost = await db.collection("posts").findOne({ _id: new ObjectId(postId) });

      return res.status(200).json({
        id: String(updatedPost._id),
        title: updatedPost.title,
        content: updatedPost.content,
        photo: updatedPost.photo || null,
        photoUrl: updatedPost.photo || null, // Also return as photoUrl for frontend
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
