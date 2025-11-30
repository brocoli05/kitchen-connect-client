// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import formidable from "formidable";

const toStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : String(item || "").trim()
      )
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            typeof item === "string" ? item.trim() : String(item || "").trim()
          )
          .filter(Boolean);
      }
    } catch {
      // fall through to CSV parsing
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const listToCsv = (list) =>
  Array.isArray(list) && list.length ? list.join(", ") : "";

const firstFieldValue = (value) => (Array.isArray(value) ? value[0] : value);

const normalizeOptionalString = (value) => {
  const raw = firstFieldValue(value);
  if (raw === undefined || raw === null) return null;
  const str = String(raw).trim();
  return str || null;
};

const normalizeTimeField = (value) => {
  const raw = firstFieldValue(value);
  if (raw === undefined || raw === null || raw === "") {
    return { unset: true };
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) {
    return {
      error: "Cooking time must be a non-negative number",
    };
  }
  return { value: num };
};

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

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

      const includeIngredients = toStringArray(
        post.includeIngredients ?? post.include
      );
      const excludeIngredients = toStringArray(
        post.excludeIngredients ?? post.exclude
      );

      let author = null;
      if (post.authorId) {
        author = await db
          .collection("users")
          .findOne({ _id: new ObjectId(post.authorId) });
      }

      return res.status(200).json({
        id: String(post._id),
        title: post.title ?? "",
        content: post.content ?? "",
        photo: post.photo ?? null,
        author: author
          ? {
              id: String(author._id),
              name: author.username,
              avatar: author.profileImage || null,
            }
          : null,
        createdAt: post.createdAt ?? null,
        likes: post.likes ?? 0,
        reposts: post.reposts ?? 0,
        comments: post.comments ?? 0,
        views: post.views ?? 0,
        timeMax: post.timeMax ?? null,
        difficulty: post.difficulty ?? null,
        dietary: post.dietary ?? null,
        includeIngredients,
        excludeIngredients,
        include: listToCsv(includeIngredients),
        exclude: listToCsv(excludeIngredients),
      });
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
          const possiblePath = post.photo.startsWith("/")
            ? post.photo.slice(1)
            : post.photo;
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
      const updates = {};
      const unsetFields = {};

      // Helper: promisify formidable.parse
      const parseForm = (form, req) =>
        new Promise((resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) return reject(err);
            resolve([fields, files]);
          });
        });

      // Check if request has FormData (multipart)
      if (req.headers["content-type"]?.includes("multipart/form-data")) {
        const form = formidable({
          maxFileSize: 5 * 1024 * 1024,
          allowEmptyFiles: false,
          filter: ({ mimetype }) => !mimetype || mimetype.includes("image"),
        });

        const [fields, files] = await parseForm(form, req);
        title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        content = Array.isArray(fields.content)
          ? fields.content[0]
          : fields.content;
        photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;
        if (hasOwn(fields, "timeMax")) {
          const timeResult = normalizeTimeField(fields.timeMax);
          if (timeResult.error) {
            return res.status(400).json({ message: timeResult.error });
          }
          if (timeResult.unset) unsetFields.timeMax = "";
          else updates.timeMax = timeResult.value;
        }

        if (hasOwn(fields, "difficulty")) {
          const difficultyValue = normalizeOptionalString(fields.difficulty);
          if (difficultyValue === null) unsetFields.difficulty = "";
          else updates.difficulty = difficultyValue;
        }

        if (hasOwn(fields, "dietary")) {
          const dietaryValue = normalizeOptionalString(fields.dietary);
          if (dietaryValue === null) unsetFields.dietary = "";
          else updates.dietary = dietaryValue;
        }

        const includeFieldKey = hasOwn(fields, "includeIngredients")
          ? "includeIngredients"
          : hasOwn(fields, "include")
          ? "include"
          : null;
        if (includeFieldKey) {
          const includeValues = toStringArray(fields[includeFieldKey]);
          if (includeValues.length) updates.includeIngredients = includeValues;
          else unsetFields.includeIngredients = "";
        }

        const excludeFieldKey = hasOwn(fields, "excludeIngredients")
          ? "excludeIngredients"
          : hasOwn(fields, "exclude")
          ? "exclude"
          : null;
        if (excludeFieldKey) {
          const excludeValues = toStringArray(fields[excludeFieldKey]);
          if (excludeValues.length) updates.excludeIngredients = excludeValues;
          else unsetFields.excludeIngredients = "";
        }
      } else {
        // Parse raw JSON since bodyParser is disabled
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

        title = parsed.title;
        content = parsed.content;

        if (hasOwn(parsed, "timeMax")) {
          const timeResult = normalizeTimeField(parsed.timeMax);
          if (timeResult.error) {
            return res.status(400).json({ message: timeResult.error });
          }
          if (timeResult.unset) unsetFields.timeMax = "";
          else updates.timeMax = timeResult.value;
        }

        if (hasOwn(parsed, "difficulty")) {
          const difficultyValue = normalizeOptionalString(parsed.difficulty);
          if (difficultyValue === null) unsetFields.difficulty = "";
          else updates.difficulty = difficultyValue;
        }

        if (hasOwn(parsed, "dietary")) {
          const dietaryValue = normalizeOptionalString(parsed.dietary);
          if (dietaryValue === null) unsetFields.dietary = "";
          else updates.dietary = dietaryValue;
        }

        if (hasOwn(parsed, "includeIngredients") || hasOwn(parsed, "include")) {
          const includePayload = hasOwn(parsed, "includeIngredients")
            ? parsed.includeIngredients
            : parsed.include;
          const includeValues = toStringArray(includePayload);
          if (includeValues.length) updates.includeIngredients = includeValues;
          else unsetFields.includeIngredients = "";
        }

        if (hasOwn(parsed, "excludeIngredients") || hasOwn(parsed, "exclude")) {
          const excludePayload = hasOwn(parsed, "excludeIngredients")
            ? parsed.excludeIngredients
            : parsed.exclude;
          const excludeValues = toStringArray(excludePayload);
          if (excludeValues.length) updates.excludeIngredients = excludeValues;
          else unsetFields.excludeIngredients = "";
        }
      }

      // Validate
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
        ...updates, // Include all fields from the `updates` object
      };

      // If photo uploaded, store as base64 in DB (works on deployed hosts)
      if (photoFile) {
        try {
          const tempPath =
            photoFile.filepath ||
            photoFile.path ||
            photoFile.tempFilePath ||
            photoFile.file?.path;
          const mimetype = photoFile.mimetype || photoFile.type || "image/jpeg";

          if (!tempPath || !fs.existsSync(tempPath)) {
            console.error("Uploaded file temp path missing or not found:", {
              tempPath,
              photoFile,
            });
            return res
              .status(500)
              .json({ message: "Uploaded file not found on server" });
          }

          const buffer = fs.readFileSync(tempPath);
          const base64Image = `data:${mimetype};base64,${buffer.toString(
            "base64"
          )}`;
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {
            /* ignore */
          }

          updateFields.photo = base64Image;
        } catch (err) {
          console.error("Error handling uploaded photo:", err);
          return res.status(500).json({ message: "Error uploading photo" });
        }
      }

      const updateOps = { $set: updateFields };
      if (Object.keys(unsetFields).length) {
        updateOps.$unset = unsetFields;
      }

      await db
        .collection("posts")
        .updateOne({ _id: new ObjectId(postId) }, updateOps);
      const updatedPost = await db
        .collection("posts")
        .findOne({ _id: new ObjectId(postId) });

      return res.status(200).json({
        id: String(updatedPost._id),
        title: updatedPost.title,
        content: updatedPost.content,
        photo: updatedPost.photo || null,
        photoUrl: updatedPost.photo || null,
        authorId: updatedPost.authorId,
        updatedAt: updatedPost.updatedAt || null,
        timeMax: updatedPost.timeMax ?? null,
        difficulty: updatedPost.difficulty ?? null,
        dietary: updatedPost.dietary ?? null,
        includeIngredients: toStringArray(updatedPost.includeIngredients),
        excludeIngredients: toStringArray(updatedPost.excludeIngredients),
        include: listToCsv(toStringArray(updatedPost.includeIngredients)),
        exclude: listToCsv(toStringArray(updatedPost.excludeIngredients)),
      });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (e) {
    console.error("[POSTS /api/posts/:postId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
