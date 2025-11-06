// pages/api/users/favorite.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Disable any caching for this endpoint
  res.setHeader("Cache-Control", "no-store");

  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Example schema: a favorites collection with { userId, postId }
    const favs = await db
      .collection("favorites")
      .find({ userId: String(userId) })
      .toArray();

    const postIds = favs
      .map((f) => f.postId)
      .filter(Boolean)
      .map((pid) => (ObjectId.isValid(pid) ? new ObjectId(pid) : pid));

    let items = [];
    if (postIds.length) {
      const posts = await db
        .collection("posts")
        .find({
          $or: [
            { _id: { $in: postIds.filter((x) => x instanceof ObjectId) } },
            { id: { $in: postIds.filter((x) => typeof x === "string") } },
          ],
        })
        .toArray();

      // normalize _id -> id
      items = posts.map((p) => ({
        ...p,
        id: String(p._id || p.id),
      }));
    }

    return res.status(200).json({ items, total: items.length });
  } catch (e) {
    console.error("[GET /api/users/favorite]", e);
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
}