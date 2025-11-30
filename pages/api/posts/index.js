// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/** Build a safe case-insensitive regex */
function rx(s) {
  return new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Parse a positive integer with fallback */
function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Disable caching for search/filter API
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

    // Keyword search across title/content/dietary (case-insensitive)
    if (q && String(q).trim() !== "") {
      filter.$or = [
        { title: { $regex: rx(q) } },
        { content: { $regex: rx(q) } },
        { dietary: { $regex: rx(q) } },
      ];
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

    // Split helpers for include/exclude lists (comma or whitespace)
    const split = (s) =>
      String(s)
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter(Boolean);

    const inc = split(include);
    const exc = split(exclude);

    // Include: documents whose includeIngredients contain all provided tokens
    if (inc.length) {
      filter.$and = [
        ...(filter.$and || []),
        ...inc.map((word) => ({ includeIngredients: { $regex: rx(word) } })),
      ];
    }

    // Exclude: documents whose excludeIngredients contain all provided tokens
    // (e.g., searching "nuts" will surface recipes that have "nuts" in excludeIngredients)
    if (exc.length) {
      filter.$and = [
        ...(filter.$and || []),
        ...exc.map((word) => ({ excludeIngredients: { $regex: rx(word) } })),
      ];
    }

    // ---- Sorting ----
    const { sortField, sortOrder } = req.query;

    let sortOption = {};

    if (sortField === "title") {
      sortOption.title = sortOrder === "asc" ? 1 : -1;
    } else if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "liked") {
      sortOption = { likeCount: -1 };
    }

    const coll = db.collection("posts");

    const [items, total] = await Promise.all([
      coll
        .find(filter)
        .collation({ locale: "en", strength: 2 })
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .toArray(),
      coll.countDocuments(filter),
    ]);

    // Normalize _id to id for the client
    const normalized = items.map((d) => ({
      ...d,
      id: String(d._id),
    }));

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const users = db.collection("users");

    const itemsWithAuthor = await Promise.all(
      normalized.map(async (post) => {
        let author = null;
        if (post.authorId) {
          const user = await users.findOne({
            _id: new ObjectId(post.authorId),
          });
          if (user) {
            author = {
              id: String(user._id),
              name: user.username,
              avatar: user.profileImage || null,
            };
          }
        }
        return {
          ...post,
          author,
        };
      })
    );

    return res.status(200).json({
      items: itemsWithAuthor,
      total,
      totalPages, // used by /recipes
      page, // used by /recipes
      pageCount: totalPages, // also provide alias for /pages/posts/index.jsx
    });
  } catch (e) {
    console.error("[/api/posts] error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
