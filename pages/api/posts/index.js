// pages/api/posts/index.js
import clientPromise from "@/lib/mongodb";

/** Build a safe case-insensitive regex */
function rx(s) {
  return new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

/** Sanitize positive integer with a fallback */
function toInt(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Split comma-separated string to trimmed, lowercased tokens */
function toTokens(csv) {
  return String(csv)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const coll = db.collection("posts");

    // read filters as you already do ...
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

    // Build a base filter for "originals"
    const baseFilter = { $or: [{ type: { $exists: false } }, { type: { $ne: "repost" } }] };

    // Apply search filters to originals
    const keywordOr = [];
    if (q && String(q).trim() !== "") {
      keywordOr.push({ title: { $regex: rx(q) } });
      keywordOr.push({ content: { $regex: rx(q) } });
      keywordOr.push({ dietary: { $regex: rx(q) } });
    }
    if (keywordOr.length) baseFilter.$and = [{ $or: keywordOr }];

    if (difficulty) baseFilter.difficulty = difficulty;
    if (dietary) baseFilter.dietary = { $regex: rx(dietary) };
    if (timeMax) baseFilter.timeMax = { $lte: toInt(timeMax, 0) };
    if (include) baseFilter.includeIngredients = { $regex: rx(include) };
    if (exclude) baseFilter.excludeIngredients = { $not: { $regex: rx(exclude) } };

    // Sort option for feed
    const sortOption =
      sort === "newest" ? { createdAt: -1 } :
      sort === "liked"  ? { likeCount: -1 } :
      sort === "reposts"? { repostCount: -1 } :
      { createdAt: -1 }; // default newest-ish

    // Pipeline to merge originals + reposts
    const pipeline = [
      // originals branch
      { $match: baseFilter },
      { $addFields: { feedType: "original" } },

      // union with reposts (look up their originals and project unify fields)
      {
        $unionWith: {
          coll: "posts",
          pipeline: [
            { $match: { type: "repost" } },
            // Join original
            {
              $lookup: {
                from: "posts",
                let: { oid: { $toObjectId: "$originalId" } },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$oid"] } } },
                ],
                as: "original",
              }
            },
            { $unwind: "$original" },
            // Optional: if you want to apply the same filters to originals for repost entries:
            ...(keywordOr.length ? [{ $match: { $or: keywordOr.map(k => ({["original."+Object.keys(k)[0]]: Object.values(k)[0]})) } }] : []),
            ...(difficulty ? [{ $match: { "original.difficulty": difficulty } }] : []),
            ...(dietary ? [{ $match: { "original.dietary": { $regex: rx(dietary) } } }] : []),
            ...(timeMax ? [{ $match: { "original.timeMax": { $lte: toInt(timeMax, 0) } } }] : []),

            // Normalize fields to look like originals, but mark as repost
            {
              $project: {
                _id: 1,
                type: 1,
                createdAt: 1,           // repost time
                repostAuthorId: "$authorId",
                originalId: 1,
                // unify fields shown in cards:
                title: "$original.title",
                content: "$original.content",
                photo: "$original.photo",
                authorId: "$original.authorId",
                timeMax: "$original.timeMax",
                difficulty: "$original.difficulty",
                dietary: "$original.dietary",
                likeCount: "$original.likeCount",
                repostCount: "$original.repostCount",
                feedType: { $literal: "repost" },
              }
            }
          ]
        }
      },

      // Sort/paginate
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limit },
    ];

    const items = await coll.aggregate(pipeline).toArray();

    // Total count (approx)—you can refine if needed:
    const total = await coll.countDocuments({}); // quick estimate

    const normalized = items.map(d => ({ ...d, id: String(d._id) }));
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