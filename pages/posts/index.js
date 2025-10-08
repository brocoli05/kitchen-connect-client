// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper: turn "a, b , c" => ["a","b","c"]
const toList = (v) =>
  typeof v === "string"
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(v)
    ? v.filter(Boolean).map(String)
    : [];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection("posts");

    // --- Query params ---
    const {
      q = "",
      timeMax = "",
      difficulty = "",
      dietary = "",
      include = "",
      exclude = "",
      sort = "relevance", // "relevance" | "newest" | "liked"
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // --- Build Mongo filter ---
    const filter = {};

    // Text & keyword search (title/content)
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
      ];
    }

    if (timeMax) {
      const n = parseInt(timeMax, 10);
      if (!Number.isNaN(n)) {
        filter.timeMax = { $lte: n };
      }
    }

    // Difficulty exact match (Easy/Medium/Hard)
    if (difficulty) {
      filter.difficulty = difficulty;
    }

    // Dietary tags (stored as string or array — cover both)
    if (dietary) {
      const norm = dietary.trim();
      filter.$and = (filter.$and || []).concat([
        {
          $or: [
            { dietary: { $regex: `^${norm}$`, $options: "i" } }, // string field
            { dietary: { $elemMatch: { $regex: `^${norm}$`, $options: "i" } } }, // array
            { tags: { $elemMatch: { $regex: `^${norm}$`, $options: "i" } } }, // sometimes stored in tags
          ],
        },
      ]);
    }

    // Ingredients include / exclude (assumes `ingredients` array of strings)
    const includeList = toList(include);
    if (includeList.length) {
      filter.ingredients = { $all: includeList.map((t) => new RegExp(`^${t}$`, "i")) };
    }
    const excludeList = toList(exclude);
    if (excludeList.length) {
      filter.ingredients = Object.assign(filter.ingredients || {}, {
        $not: { $elemMatch: { $in: excludeList.map((t) => new RegExp(`^${t}$`, "i")) } },
      });
    }

    // --- Sort map ---
    const sortMap = {
      relevance: q ? { score: { $meta: "textScore" } } : { createdAt: -1 }, // fallback
      newest: { createdAt: -1 },
      liked: { likeCount: -1, createdAt: -1 },
    };
    const sortStage = sortMap[sort] || sortMap.relevance;

    // --- Projection (include text score only when q exists & use $text) ---
    const projection = q
      ? { score: { $meta: "textScore" } }
      : { };

    // --- Query / count / pagination ---
    const [items, total] = await Promise.all([
      col
        .find(filter, { projection })
        .sort(sortStage)
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      col.countDocuments(filter),
    ]);

    return res.status(200).json({
      items,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (e) {
    console.error("[GET /api/posts]", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
