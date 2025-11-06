// pages/api/posts/[postId]/isFavorite.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  res.setHeader("Cache-Control", "no-store");

  try {
    // Token is optional: if no token, isFavorited = false
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(200).json({ isFavorited: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(decoded.userId);
    const { postId } = req.query;

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const fav = await db.collection("favorites").findOne({
      userId,
      postId: String(postId),
    });

    return res.status(200).json({ isFavorited: !!fav });
  } catch (e) {
    console.error("[GET /api/posts/:postId/isFavorite]", e);
    if (e.name === "JsonWebTokenError" || e.name === "TokenExpiredError") {
      return res.status(200).json({ isFavorited: false });
    }
    return res.status(500).json({ isFavorited: false });
  }
}