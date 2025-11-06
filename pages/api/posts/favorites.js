// pages/api/posts/favorites.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/** Parse positive int with fallback */
function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method Not Allowed" });

  // Disable caches to avoid 304-without-body problems
  res.setHeader("Cache-Control", "no-store");

  try {
    // --- Auth: Bearer token required ---
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }

    const userId = String(decoded.userId);

    // --- Pagination ---
    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 12);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB); // e.g., "kitchen-connect"

    // --- Count total favorites first ---
    const total = await db.collection("favorites").countDocuments({ userId });

    // --- Fetch user's favorite postIds (paged, newest first) ---
    const favDocs = await db
      .collection("favorites")
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const postIds = favDocs
      .map((f) => {
        try {
          return new ObjectId(String(f.postId));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    let items = [];
    if (postIds.length) {
      // Fetch posts by ids
      const posts = await db
        .collection("posts")
        .find({ _id: { $in: postIds } })
        .toArray();

      // Normalize schema and preserve fav order
      const map = new Map(posts.map((p) => [String(p._id), p]));
      items = postIds
        .map((id) => {
          const doc = map.get(String(id));
          if (!doc) return null;
          return {
            id: String(doc._id),
            title: doc.title ?? "",
            content: doc.content ?? "",
            photo: doc.photo ?? "",
            authorId: doc.authorId ?? doc.userId ?? null,
            createdAt: doc.createdAt ?? null,
            likeCount: doc.likeCount ?? 0,
            // Any extra searchable fields, if needed:
            timeMax: doc.timeMax ?? null,
            difficulty: doc.difficulty ?? null,
            dietary: doc.dietary ?? null,
          };
        })
        .filter(Boolean);
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      items,
      total,
      totalPages,
      page,
    });
  } catch (e) {
    console.error("[/api/posts/favorites] error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}