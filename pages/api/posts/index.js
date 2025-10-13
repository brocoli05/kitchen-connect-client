// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";

//create safe regex for fuzzy matching
function makeRegex(str) {
  return new RegExp(String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

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
  }
}
