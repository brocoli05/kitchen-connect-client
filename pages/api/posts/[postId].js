// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import formidable from "formidable";
import fs from "fs";

// Disable body parsing for multipart
export const config = {
  api: { bodyParser: false },
};

// Helper: build OR query for id/string
function idMatch(id) {
  const or = [{ id: String(id) }];
  if (ObjectId.isValid(id)) or.push({ _id: new ObjectId(id) });
  return { $or: or };
}

// Helper: parse multipart form
function parseForm(req) {
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024,
    allowEmptyFiles: false,
    filter: ({ mimetype }) => !!mimetype && mimetype.startsWith("image/"),
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => (err ? reject(err) : resolve({ fields, files })));
  });
}

export default async function handler(req, res) {
  const { postId } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const posts = db.collection("posts");

    // ---------- GET ----------
    if (req.method === "GET") {
      const doc = await posts.findOne(idMatch(postId));
      if (!doc) {
        res.status(404).json({ message: "Post not found" });
        return;
      }
      res.status(200).json({
        id: String(doc._id),
        title: doc.title ?? "",
        content: doc.content ?? "",
        photo: doc.photo ?? "",
        authorId: doc.authorId ?? doc.userId ?? null,
        timeMax: doc.timeMax ?? null,
        difficulty: doc.difficulty ?? null,
        dietary: doc.dietary ?? null,
        include: doc.include ?? null,
        exclude: doc.exclude ?? null,
        createdAt: doc.createdAt ?? null,
      });
      return;
    }

    // All below require auth
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
      return;
    }

    // Fetch post to authorize owner
    const existing = await posts.findOne(idMatch(postId));
    if (!existing) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    const isOwner = String(existing.authorId ?? "") === String(decoded.userId ?? "");
    if (!isOwner) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // ---------- PUT (update) ----------
    if (req.method === "PUT") {
      let updates = {};
      const contentType = req.headers["content-type"] || "";

      if (contentType.includes("multipart/form-data")) {
        // multipart with optional image
        const { fields, files } = await parseForm(req);
        if (fields.title) updates.title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        if (fields.content) updates.content = Array.isArray(fields.content) ? fields.content[0] : fields.content;
        if (fields.timeMax) updates.timeMax = Number(Array.isArray(fields.timeMax) ? fields.timeMax[0] : fields.timeMax) || 0;
        if (fields.difficulty) updates.difficulty = Array.isArray(fields.difficulty) ? fields.difficulty[0] : fields.difficulty;
        if (fields.dietary) updates.dietary = Array.isArray(fields.dietary) ? fields.dietary[0] : fields.dietary;
        if (fields.include) updates.include = Array.isArray(fields.include) ? fields.include[0] : fields.include;
        if (fields.exclude) updates.exclude = Array.isArray(fields.exclude) ? fields.exclude[0] : fields.exclude;

        const file = Array.isArray(files.photo) ? files.photo[0] : files.photo;
        if (file && file.filepath) {
          // Store as base64 
          const buffer = fs.readFileSync(file.filepath);
          const base64 = `data:${file.mimetype || "image/jpeg"};base64,${buffer.toString("base64")}`;
          updates.photo = base64;
          try { fs.unlinkSync(file.filepath); } catch {}
        }
      } else {
        // JSON body
        const raw = await new Promise((resolve, reject) => {
          let data = "";
          req.on("data", (c) => (data += c));
          req.on("end", () => resolve(data));
          req.on("error", reject);
        });
        let body = {};
        try { body = raw ? JSON.parse(raw) : {}; } catch {
          res.status(400).json({ message: "Invalid JSON body" });
          return;
        }
        const { title, content, timeMax, difficulty, dietary, include, exclude } = body;
        if (title != null) updates.title = title;
        if (content != null) updates.content = content;
        if (timeMax != null) updates.timeMax = Number(timeMax) || 0;
        if (difficulty != null) updates.difficulty = difficulty;
        if (dietary != null) updates.dietary = dietary;
        if (include != null) updates.include = include;
        if (exclude != null) updates.exclude = exclude;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ message: "No fields to update" });
        return;
      }

      await posts.updateOne({ _id: existing._id }, { $set: updates });
      const updated = await posts.findOne({ _id: existing._id });

      res.status(200).json({
        id: String(updated._id),
        title: updated.title ?? "",
        content: updated.content ?? "",
        photo: updated.photo ?? "",
        authorId: updated.authorId ?? null,
        timeMax: updated.timeMax ?? null,
        difficulty: updated.difficulty ?? null,
        dietary: updated.dietary ?? null,
        include: updated.include ?? null,
        exclude: updated.exclude ?? null,
        createdAt: updated.createdAt ?? null,
      });
      return;
    }

    // ---------- DELETE ----------
    if (req.method === "DELETE") {
      await posts.deleteOne({ _id: existing._id });
      res.status(200).json({ message: "Post deleted" });
      return;
    }

    // Fallback: 405
    res.setHeader("Allow", "GET,PUT,DELETE");
    res.status(405).json({ message: "Method Not Allowed" });
  } catch (e) {
    console.error("[/api/posts/[postId]] error:", e);
    res.status(500).json({ message: "Internal Server Error" });
  }
}