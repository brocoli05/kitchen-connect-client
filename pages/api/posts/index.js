import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");

    // Pagination
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "10", 10)));
    const skip = (page - 1) * limit;

    const total = await db.collection("posts").countDocuments({});
    const posts = await db
      .collection("posts")
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Populate basic author info
    const userIds = [...new Set(posts.map((p) => {
      if (!p || !p.authorId) return null;
      // If authorId is an ObjectId, convert to string
      if (typeof p.authorId === 'object' && p.authorId._bsontype === 'ObjectID') return String(p.authorId);
      return String(p.authorId);
    }).filter(Boolean))];
    const users = {};
    if (userIds.length) {
      // Only convert valid ObjectId strings
      const validObjectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      const uDocs = validObjectIds.length
        ? await db.collection("users").find({ _id: { $in: validObjectIds } }).toArray()
        : [];
      uDocs.forEach((u) => {
        users[String(u._id)] = u.username || u.name || "Unknown";
      });
    }

    const items = posts.map((p) => ({
      id: String(p._id),
      title: p.title || "",
      excerpt: (p.content && p.content.slice(0, 140)) || "",
      author: users[String(p.authorId)] || null,
      createdAt: p.createdAt || null,
      photo: p.photo || null,
    }));
    const pageCount = Math.ceil(total / limit) || 1;
    return res.status(200).json({ items, total, page, pageCount, limit });
  } catch (e) {
    console.error("[GET /api/posts]", e);
    return res.status(500).json({ message: "Internal server error" });
// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const col = db.collection("posts");

    // Parse query params
    const {
      q,
      timeMax,
      difficulty,
      dietary,
      include,
      exclude,
      sort = "relevance",
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};
    let usingTextSearch = false;

    // Prefer MongoDB $text search (requires a text index on title/content)
    if (q && q.trim()) {
      try {
        filter.$text = { $search: q.trim() };
        usingTextSearch = true;
      } catch {
        // If text index does not exist, fallback will be applied below
        usingTextSearch = false;
      }
    }

    // Max cooking time (number)
    const max = Number(timeMax);
    if (!Number.isNaN(max) && max > 0) filter.cookTime = { $lte: max };

    // Difficulty (e.g., "Easy" | "Medium" | "Hard")
    if (difficulty) filter.difficulty = difficulty;

    // Dietary tags (comma-separated, must all match)
    if (dietary) {
      const arr = dietary.split(",").map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.dietary = { $all: arr };
    }

    // Ingredients include/exclude (comma-separated)
    if (include) {
      const arr = include.split(",").map(s => s.trim()).filter(Boolean);
      if (arr.length) {
        filter.ingredients = { ...(filter.ingredients || {}), $all: arr };
      }
    }
    if (exclude) {
      const arr = exclude.split(",").map(s => s.trim()).filter(Boolean);
      if (arr.length) {
        filter.ingredients = { ...(filter.ingredients || {}), $nin: arr };
      }
    }

    // If text search unavailable (no index), fallback to regex over title/content
    if (q && q.trim() && !usingTextSearch) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { content: rx }]; // adjust 'content' if the field is 'description'
    }

    // Sorting rules
    const sortMap = {
      newest: { createdAt: -1 },
      liked: { likeCount: -1, createdAt: -1 },
      relevance: usingTextSearch ? { score: { $meta: "textScore" } } : { createdAt: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.relevance;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;

    // Project textScore only when using text search
    const projection = usingTextSearch ? { score: { $meta: "textScore" } } : {};

    const [items, total] = await Promise.all([
      col.find(filter).project(projection).sort(sortOption).skip(skip).limit(limitNum).toArray(),
      col.countDocuments(filter),
    ]);

    res.status(200).json({
      items: items.map(i => ({ ...i, _id: String(i._id) })),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      // note: include this if fallback used to help debugging on dev
      ...(usingTextSearch ? {} : { note: "regex fallback (no text index)" }),
    });
  } catch (e) {
    // If error is specifically about text index, try last-chance fallback
    if (String(e?.message || "").toLowerCase().includes("text index")) {
      try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const col = db.collection("posts");

        const { q = "", page = 1, limit = 12 } = req.query;
        const rx = q.trim() ? new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") : null;
        const filter = rx ? { $or: [{ title: rx }, { content: rx }] } : {};

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
        const skip = (pageNum - 1) * limitNum;

        const [items, total] = await Promise.all([
          col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).toArray(),
          col.countDocuments(filter),
        ]);

        return res.status(200).json({
          items: items.map(i => ({ ...i, _id: String(i._id) })),
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
          note: "regex fallback (no text index)",
        });
      } catch (e2) {
        console.error("[/api/posts regex fallback failed]", e2);
      }
    }

    console.error("[GET /api/posts]", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
