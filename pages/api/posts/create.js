// pages/api/posts/create.js

import jwt from "jsonwebtoken";
import clientPromise from "../../../lib/mongodb";
import formidable from "formidable";
import fs from "fs";

// Disable default body parser to handle FormData manually
export const config = {
  api: {
    bodyParser: false,
  },
};

// -------- Helpers --------

// Return the first element if the value is an array, otherwise return as-is
const first = (v) => (Array.isArray(v) ? v[0] : v);

// Normalize a potentially comma-separated string (or JSON array string) into an array
const toArray = (raw) => {
  if (raw == null) return undefined;
  const val = first(raw);

  // Already an array (rare from some clients)
  if (Array.isArray(val)) return val;

  // Only handle strings below
  if (typeof val !== "string") return undefined;

  const s = val.trim();
  if (!s) return []; // treat empty string as empty list

  // If client sent JSON array as string (e.g., '["egg","milk"]'), try to parse
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean);
      }
    } catch {
      // fall back to CSV split
    }
  }

  // CSV fallback (e.g., "egg, milk")
  return s.split(",").map((x) => x.trim()).filter(Boolean);
};

// Convert to number if present; empty string/null/undefined -> undefined; invalid -> 0 if explicitly present
const toNumberOrUndefined = (raw) => {
  if (raw == null) return undefined;
  const s = String(first(raw)).trim();
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Verify JWT token from Authorization header
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Connect to MongoDB (use env DB name if provided, else fallback)
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");

    // Helper to parse multipart form only when needed
    const parseForm = (form, req) =>
      new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve([fields, files]);
        });
      });

    // ---------- MULTIPART (FormData) ----------
    if (req.headers["content-type"]?.includes("multipart/form-data")) {
      const form = formidable({
        maxFileSize: 5 * 1024 * 1024, // 5MB limit
        allowEmptyFiles: false,
        filter: ({ mimetype }) => !mimetype || mimetype.includes("image"),
      });

      const [fields, files] = await parseForm(form, req);

      // Required fields
      const title = first(fields.title);
      const content = first(fields.content);

      if (!title || typeof title !== "string" || title.trim() === "") {
        return res.status(400).json({ message: "Title is required" });
      }
      if (!content || typeof content !== "string" || content.trim() === "") {
        return res.status(400).json({ message: "Content is required" });
      }

      // Optional fields
      const timeMax = toNumberOrUndefined(fields.timeMax);

      // Use presence-check to store even empty string values
      const hasDifficulty = Object.prototype.hasOwnProperty.call(fields, "difficulty");
      const hasDietary = Object.prototype.hasOwnProperty.call(fields, "dietary");

      const difficultyRaw = first(fields.difficulty);
      const dietaryRaw = first(fields.dietary);

      // Support both include/exclude and includeIngredients/excludeIngredients
      const includeIngredients =
        toArray(fields.includeIngredients) ?? toArray(fields.include);
      const excludeIngredients =
        toArray(fields.excludeIngredients) ?? toArray(fields.exclude);

      // Build new post
      const newPost = {
        title: title.trim(),
        content: content.trim(),
        authorId: decoded.userId,
        createdAt: new Date(),
      };

      if (timeMax !== undefined) newPost.timeMax = timeMax;

      // Always set if the key exists (even if empty string) for schema consistency
      if (hasDifficulty) newPost.difficulty = (difficultyRaw ?? "").toString().trim();
      if (hasDietary) newPost.dietary = (dietaryRaw ?? "").toString().trim();

      if (includeIngredients !== undefined) newPost.includeIngredients = includeIngredients;
      if (excludeIngredients !== undefined) newPost.excludeIngredients = excludeIngredients;

      // Handle image upload (convert to base64)
      const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
      if (photoFile) {
        const tempPath =
          photoFile.filepath ||
          photoFile.path ||
          photoFile.tempFilePath ||
          photoFile.file?.path;
        const mimetype = photoFile.mimetype || photoFile.type || "image/jpeg";

        if (!tempPath || !fs.existsSync(tempPath)) {
          console.error("Uploaded file temp path missing or not found (create):", {
            tempPath,
            photoFile,
          });
          return res.status(500).json({ message: "Uploaded file not found on server" });
        }

        try {
          const buffer = fs.readFileSync(tempPath);
          const base64Image = `data:${mimetype};base64,${buffer.toString("base64")}`;
          try {
            fs.unlinkSync(tempPath);
          } catch {
            /* ignore temp cleanup error */
          }
          newPost.photo = base64Image;
        } catch (err) {
          console.error("Error handling uploaded photo (create):", err);
          return res.status(500).json({ message: "Error uploading photo" });
        }
      }

      const { insertedId } = await db.collection("posts").insertOne(newPost);
      const created = await db.collection("posts").findOne({ _id: insertedId });

      return res.status(201).json({
        message: "Post created successfully",
        id: String(created._id),
        title: created.title ?? "",
        content: created.content ?? "",
        photo: created.photo ?? null,
        photoUrl: created.photo ?? null,
        authorId: created.authorId ?? created.userId ?? null,
        createdAt: created.createdAt ?? null,
        timeMax: created.timeMax ?? null,
        difficulty: created.difficulty ?? null,
        dietary: created.dietary ?? null,
        includeIngredients: created.includeIngredients ?? null,
        excludeIngredients: created.excludeIngredients ?? null,
      });
    }

    // ---------- JSON (non-FormData) ----------
    // Read raw body since bodyParser is disabled
    const raw = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => (data += chunk));
      req.on("end", () => resolve(data));
      req.on("error", (err) => reject(err));
    });

    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).json({ message: "Invalid JSON body" });
    }

    const title = parsed.title;
    const content = parsed.content;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "Content is required" });
    }

    // Optional fields (presence-aware)
    const hasDifficulty = Object.prototype.hasOwnProperty.call(parsed, "difficulty");
    const hasDietary = Object.prototype.hasOwnProperty.call(parsed, "dietary");

    const timeMax =
      parsed.timeMax === "" || parsed.timeMax == null ? undefined : Number(parsed.timeMax);

    // Support both include/exclude and includeIngredients/excludeIngredients
    const includeIngredients =
      toArray(parsed.includeIngredients) ?? toArray(parsed.include);
    const excludeIngredients =
      toArray(parsed.excludeIngredients) ?? toArray(parsed.exclude);

    const newPost = {
      title: title.trim(),
      content: content.trim(),
      authorId: decoded.userId,
      createdAt: new Date(),
    };

    if (timeMax !== undefined && Number.isFinite(timeMax)) newPost.timeMax = timeMax;

    // Always set if the key exists (even if empty string)
    if (hasDifficulty) newPost.difficulty = (parsed.difficulty ?? "").toString().trim();
    if (hasDietary) newPost.dietary = (parsed.dietary ?? "").toString().trim();

    if (includeIngredients !== undefined) newPost.includeIngredients = includeIngredients;
    if (excludeIngredients !== undefined) newPost.excludeIngredients = excludeIngredients;

    const { insertedId } = await db.collection("posts").insertOne(newPost);
    const created = await db.collection("posts").findOne({ _id: insertedId });

    return res.status(201).json({
      message: "Post created successfully",
      id: String(created._id),
      title: created.title ?? "",
      content: created.content ?? "",
      photo: created.photo ?? null,
      photoUrl: created.photo ?? null,
      authorId: created.authorId ?? created.userId ?? null,
      createdAt: created.createdAt ?? null,
      timeMax: created.timeMax ?? null,
      difficulty: created.difficulty ?? null,
      dietary: created.dietary ?? null,
      includeIngredients: created.includeIngredients ?? null,
      excludeIngredients: created.excludeIngredients ?? null,
    });
  } catch (error) {
    // Token-related errors
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Unauthorized: Invalid or expired token",
      });
    }

    console.error("Create post error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}