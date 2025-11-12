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
    // keep compatibility with code below that references baseFilter
    const baseFilter = filter;

    const keywordOr = [];

// Keyword: match title/content/dietary (case-insensitive)
if (q && String(q).trim() !== "") {
  const r = rx(q);
  keywordOr.push(
    { title: { $regex: r } },
    { content: { $regex: r } },
    { dietary: { $regex: r } }
  );
}

// attach $or if we have any keyword filters
if (keywordOr.length) {
  filter.$or = keywordOr;
}

// Exact difficulty match
if (difficulty) filter.difficulty = difficulty;

// Dietary tag partial match
if (dietary) filter.dietary = { $regex: rx(dietary) };

// Max cooking time: <= timeMax
if (timeMax) {
  const tmax = toInt(timeMax, 0);
  if (tmax > 0) filter.timeMax = { $lte: tmax };
}

// Split helpers for include/exclude
const split = (s) =>
  String(s)
    .split(/[\s,]+/)
    .map((v) => v.trim())
    .filter(Boolean);

const inc = split(include);
const exc = split(exclude);

// Include: must match all tokens
if (inc.length) {
  filter.$and = [
    ...(filter.$and || []),
    ...inc.map((word) => ({ includeIngredients: { $regex: rx(word) } })),
  ];
}

// Exclude: must match all tokens
if (exc.length) {
  filter.$and = [
    ...(filter.$and || []),
    ...exc.map((word) => ({ excludeIngredients: { $regex: rx(word) } })),
  ];
}

// ---- Sorting ----
const sortOption =
  sort === "newest"
    ? { createdAt: -1 }
    : sort === "liked"
        ? { likeCount: -1, createdAt: -1 }
        : {}; // relevance fallback = insertion order \

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

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      items: normalized,
      total,
      totalPages,     // used by /recipes
      page,           // used by /recipes
      pageCount: totalPages, // also provide alias for /pages/posts/index.jsx
    });
  } catch (e) {
    console.error("[/api/posts] error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}