// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";
<<<<<<< Updated upstream
=======

//create safe regex for fuzzy matching
function makeRegex(str) {
  return new RegExp(String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}
>>>>>>> Stashed changes

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
<<<<<<< Updated upstream
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
=======

    // Extract query parameters
    const {
      q = "",
      timeMax,
      difficulty,
      dietary,
      include,
      exclude,
      sort = "relevance",
      page = 1,
      limit = 12,
    } = req.query;

    // --- Build filter ---
    const filter = {};
    const conditions = [];

    // Keyword search: title, content, dietary
    if (q.trim()) {
      const keyword = makeRegex(q);
      conditions.push({
        $or: [
          { title: { $regex: keyword } },
          { content: { $regex: keyword } },
          { dietary: { $regex: keyword } },
        ],
      });
    }

    // Filter by difficulty
    if (difficulty) conditions.push({ difficulty });

    // Filter by dietary text
    if (dietary) conditions.push({ dietary: { $regex: makeRegex(dietary) } });

    // Filter by time (numerical field)
    if (timeMax) conditions.push({ timeMax: { $lte: parseInt(timeMax, 10) } });

    // Include ingredients
    if (include)
      conditions.push({ includeIngredients: { $regex: makeRegex(include) } });

    // Exclude ingredients
    if (exclude)
      conditions.push({
        includeIngredients: { $not: makeRegex(exclude) },
      });

    // Combine filters
    if (conditions.length > 0) filter.$and = conditions;

    // --- Pagination ---
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    // --- Sorting ---
    const sortOption =
      sort === "newest"
        ? { createdAt: -1 }
        : sort === "liked"
        ? { likeCount: -1 }
        : {}; // default = relevance

    // --- Query database ---
    const [items, total] = await Promise.all([
      db.collection("posts").find(filter).sort(sortOption).skip(skip).limit(parseInt(limit, 10)).toArray(),
      db.collection("posts").countDocuments(filter),
    ]);

    // Return response
    return res.status(200).json({
      items,
      total,
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      page: parseInt(page, 10),
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
>>>>>>> Stashed changes
  }
}
