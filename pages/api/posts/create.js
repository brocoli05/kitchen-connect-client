// pages/api/posts/create.js
import jwt from "jsonwebtoken";
import clientPromise from "../../../lib/mongodb";
import formidable from "formidable";
import fs from "fs";

// Disable Next.js built-in body parser (we handle both JSON and multipart)
export const config = { api: { bodyParser: false } };

/** Safely parse JSON from a raw request body when bodyParser is disabled */
async function readJsonBody(req) {
  const raw = await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
  return raw ? JSON.parse(raw) : {};
}

/** Small helper to parse formidable with Promise */
function parseForm(req) {
  const form = formidable({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowEmptyFiles: false,
    // Allow requests with or without files. If a file is present, it must be image/*
    filter: ({ mimetype }) => !mimetype || mimetype.startsWith("image/"),
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  // ---- Auth ----
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbName = process.env.MONGODB_DB || "kitchen-connect";
    const client = await clientPromise;
    const db = client.db(dbName);

    // ---- Decide payload type (multipart vs JSON) ----
    const isMultipart = req.headers["content-type"]?.includes("multipart/form-data");

    let payload = {
      title: "",
      content: "",
      timeMax: undefined,
      difficulty: undefined,
      dietary: undefined,
      include: undefined,
      exclude: undefined,
      photo: undefined,
    };

    if (isMultipart) {
      // ---- multipart/form-data ----
      const { fields, files } = await parseForm(req);

      const pick = (v) => (Array.isArray(v) ? v[0] : v);
      payload.title = pick(fields.title) || "";
      payload.content = pick(fields.content) || "";

      // optional filter fields
      const timeMax = pick(fields.timeMax);
      payload.timeMax = timeMax !== undefined && timeMax !== "" ? Number(timeMax) : undefined;
      payload.difficulty = pick(fields.difficulty) || undefined;
      payload.dietary = pick(fields.dietary) || undefined;
      payload.include = pick(fields.include) || undefined;
      payload.exclude = pick(fields.exclude) || undefined;

      // optional image
      const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
      if (photoFile && photoFile.filepath) {
        try {
          const buffer = fs.readFileSync(photoFile.filepath);
          const mime = photoFile.mimetype || "image/jpeg";
          payload.photo = `data:${mime};base64,${buffer.toString("base64")}`;
        } finally {
          // best-effort cleanup
          try { fs.unlinkSync(photoFile.filepath); } catch (_) {}
        }
      }
    } else {
      // ---- application/json ----
      const b = await readJsonBody(req);
      payload.title = b.title ?? "";
      payload.content = b.content ?? "";
      payload.timeMax = typeof b.timeMax === "number" ? b.timeMax : undefined;
      payload.difficulty = b.difficulty || undefined;
      payload.dietary = b.dietary || undefined;
      payload.include = b.include || undefined;
      payload.exclude = b.exclude || undefined;
      // no photo via JSON path
    }

    // ---- Minimal validation ----
    if (!payload.title.trim() || !payload.content.trim()) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    // ---- Build document ----
    const doc = {
      title: payload.title.trim(),
      content: payload.content,
      authorId: decoded.userId,
      createdAt: new Date(),
    };

    // optional fields only if provided
    if (Number.isFinite(payload.timeMax)) doc.timeMax = payload.timeMax;
    if (payload.difficulty) doc.difficulty = payload.difficulty;
    if (payload.dietary) doc.dietary = payload.dietary;
    if (payload.include) doc.include = payload.include;
    if (payload.exclude) doc.exclude = payload.exclude;
    if (payload.photo) doc.photo = payload.photo;

    // ---- Insert ----
    const result = await db.collection("posts").insertOne(doc);

    // ✅ Return the inserted id so the client can redirect to /posts/[id]
    return res.status(201).json({ id: String(result.insertedId), message: "Post created" });
  } catch (err) {
    // JWT errors -> 401
    if (err?.name === "JsonWebTokenError" || err?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }

    // Log full error server-side for debugging
    console.error("[/api/posts/create] error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}