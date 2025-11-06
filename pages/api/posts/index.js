// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";

/** Build a safe case-insensitive regex */
function rx(s) {
  return new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Sanitize numeric query params */
function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const {
      q = "",
      timeMax = "",
      difficulty = "",
      dietary = "",
      include = "",
      exclude = "",
      sort = "relevance",
    } = req.query;

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 12);
    const skip = (page - 1) * limit;

    // We'll compose conditions using $and to avoid mixing $or blocks unexpectedly
    const and = [];

    // 🔹 Keyword search across title/content/dietary
    if (q && String(q).trim() !== "") {
      and.push({
        $or: [
          { title:   { $regex: rx(q) } },
          { content: { $regex: rx(q) } },
          { dietary: { $regex: rx(q) } },
        ],
      });
    }

    // 🔹 Difficulty
    if (difficulty) and.push({ difficulty });

    // 🔹 Dietary
    if (dietary) and.push({ dietary: { $regex: rx(dietary) } });

    // 🔹 Max time (numeric)
    if (timeMax) and.push({ timeMax: { $lte: toInt(timeMax, 0) } });

    // 🔹 Include ingredients (match presence)
    if (include) {
      // Support both array-of-strings and comma-separated string fields
      and.push({
        $or: [
          { includeIngredients: { $regex: rx(include) } },                // string field
          { includeIngredients: { $elemMatch: { $regex: rx(include) } } } // array field
        ],
      });
    }

    // 🔸 Exclude (positive match) — show only recipes that declare they exclude this ingredient
    if (exclude) {
      and.push({
        $or: [
          { excludeIngredients: { $regex: rx(exclude) } },                // string field ("pork, beef")
          { excludeIngredients: { $elemMatch: { $regex: rx(exclude) } } } // array field (["pork","beef"])
        ],
      });
    }

    // Build final filter
    const filter = and.length ? { $and: and } : {};

    const sortOption =
      sort === "newest" ? { createdAt: -1 } :
      sort === "liked"  ? { likeCount: -1 } :
      {}; // default relevance fallback

    const coll = db.collection("posts");
    const [items, total] = await Promise.all([
      coll.find(filter).sort(sortOption).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter),
    ]);

    const normalized = items.map((d) => ({ ...d, id: String(d._id) }));

    return res.status(200).json({
      items: normalized,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
    });
  } catch (e) {
    console.error("[/api/posts] error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}