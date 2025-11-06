// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";

/** Build a safe case-insensitive regex (escape user input) */
function rx(s) {
  return new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Parse positive integers with fallback */
function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") return res.status(405).end();

  // Disable caching for search/filter endpoints
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("CDN-Cache-Control", "no-store");
  res.setHeader("Vercel-CDN-Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Query params
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

    // ---- Build MongoDB filter ----
    const filter = {};

    // Keyword search (title/content/dietary)
    if (q && String(q).trim() !== "") {
      filter.$or = [
        { title: { $regex: rx(q) } },
        { content: { $regex: rx(q) } },
        { dietary: { $regex: rx(q) } }, // safe to keep even if field is absent
        { includeIngredients: { $regex: rx(q) } },
        { excludeIngredients: { $regex: rx(q) } },
      ];
    }

    // Difficulty (exact match)
    if (difficulty) filter.difficulty = difficulty;

    // Dietary (partial / case-insensitive)
    if (dietary) filter.dietary = { $regex: rx(dietary) };

    // Time (<= timeMax)
    if (timeMax) {
      const t = toInt(timeMax, 0);
      if (t > 0) filter.timeMax = { $lte: t };
    }

    // Include / Exclude ingredients
    if (include) {
      // Split by comma, trim spaces, ignore empty values
      const terms = String(include)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    
      // Require all "include" terms to be present in includeIngredients
      if (terms.length > 0) {
        filter.$and = (filter.$and || []).concat(
          terms.map((t) => ({
            // Works for both string and array fields in MongoDB
            includeIngredients: { $regex: rx(t) },
          }))
        );
      }
    }
    
    if (exclude) {
      // Split by comma, trim spaces, ignore empty values
      const terms = String(exclude)
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    
      // e.g., exclude="pork, beef" => must have both "pork" AND "beef" in excludeIngredients
      if (terms.length > 0) {
        filter.$and = (filter.$and || []).concat(
          terms.map((t) => ({
            // Match posts where excludeIngredients contains the term
            excludeIngredients: { $regex: rx(t) },
          }))
        );
      }
    }
    // if (include) filter.ingredients = { $elemMatch: { $regex: rx(include) } };
    // if (exclude) filter.ingredients = { $not: { $elemMatch: { $regex: rx(exclude) } } };

    // ---- Sorting ----
    // "relevance" is a no-op here unless uses $text with a text index.
    // Fallbacks: newest or most liked.
    let sortOption = {};
    if (sort === "newest") sortOption = { createdAt: -1 };
    else if (sort === "liked") sortOption = { likeCount: -1 };
    // else keep {} so Mongo returns insertion order 

    // Debug (optional): see filter actually sent to Mongo
    // console.log("[/api/posts] filter:", JSON.stringify(filter));

    const coll = db.collection("posts");

    // Query & total
    const [items, total] = await Promise.all([
      coll.find(filter).sort(sortOption).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter),
    ]);

    // Normalize _id to id for frontend convenience
    const normalized = items.map((d) => ({
      ...d,
      id: String(d._id),
    }));

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