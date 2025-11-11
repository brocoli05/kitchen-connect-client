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

  // Avoid any caching during search/filtering
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

    // ---- Build MongoDB filter ----
    const filter = {};

    // Keyword: match title or content (and optionally dietary if you store it)
    if (q && String(q).trim() !== "") {
      filter.$or = [
        { title: { $regex: rx(q) } },
        { content: { $regex: rx(q) } },
        { dietary: { $regex: rx(q) } }, // safe even if field absent
      ];
    }

    // Optional filters (only apply when present)
    if (difficulty) filter.difficulty = difficulty;
    if (dietary) filter.dietary = { $regex: rx(dietary) };
    if (timeMax) filter.timeMax = { $lte: toInt(timeMax, 0) };

<<<<<<< Updated upstream
    if (include) filter.includeIngredients = { $regex: rx(include) };
    if (exclude) filter.excludeIngredients = { $not: { $regex: rx(exclude) } };
=======
    if (difficulty) baseFilter.difficulty = difficulty;
    if (dietary) baseFilter.dietary = { $regex: rx(dietary) };

    if (timeMax) {
      const tmax = toInt(timeMax, 0);
      if (tmax > 0) baseFilter.timeMax = { $lte: tmax };
    }

    // Keep your original include/exclude style (regex-based)
    if (include) {
      
      // for now keep minimal change: regex contains
      baseFilter.includeIngredients = { $regex: rx(include) };
    }
    if (exclude) {
      // Match documents whose excludeIngredients contains the token
      baseFilter.excludeIngredients = { $regex: rx(exclude) };
    }
>>>>>>> Stashed changes

    // ---- Sorting ----
    const sortOption =
      sort === "newest"
        ? { createdAt: -1 }
        : sort === "liked"
        ? { likeCount: -1 }
        : {}; // relevance fallback = keep insertion order or $text if you add index

    // DEBUG: check the actual filter used
    console.log("[/api/posts] filter:", JSON.stringify(filter));

    const coll = db.collection("posts");

    const [items, total] = await Promise.all([
      coll.find(filter).sort(sortOption).skip(skip).limit(limit).toArray(),
      coll.countDocuments(filter),
    ]);

    // normalize _id to id
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