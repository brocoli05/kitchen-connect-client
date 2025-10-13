import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

//create safe regex for fuzzy matching
function makeRegex(str) {
  return new RegExp(String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

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

    const users = userIds.length > 0
      ? await db.collection("users").find({ _id: { $in: userIds.map(id => new ObjectId(id)) } }).toArray()
      : [];
    
    const userMap = users.reduce((acc, user) => {
      acc[String(user._id)] = { username: user.username || 'Unknown' };
      return acc;
    }, {});

    // Normalize & return
    const items = posts.map((p) => ({
      id: String(p._id),
      title: p.title || "",
      content: p.content || "",
      authorId: p.authorId ? String(p.authorId) : null,
      author: p.authorId ? userMap[String(p.authorId)] || { username: 'Unknown' } : { username: 'Unknown' },
      createdAt: p.createdAt || null,
      photo: p.photo || null,
    }));
    const pageCount = Math.ceil(total / limit) || 1;
    return res.status(200).json({ items, total, page, pageCount, limit });
  } catch (e) {
    console.error("[GET /api/posts]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}