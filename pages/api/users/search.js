// pages/api/users/search.js
// Search users by partial name / username for starting conversations

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const auth = req.headers.authorization;
  const token = auth?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const q = String(req.query.q || "").trim();
  if (!q) return res.status(200).json({ items: [] });

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Case-insensitive search on username / name
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const users = await db
      .collection("users")
      .find({
        $and: [
          { _id: { $ne: decoded.userId } }, // exclude self
          {
            $or: [{ username: regex }, { name: regex }],
          },
        ],
      })
      .project({ username: 1, name: 1, avatarUrl: 1 })
      .limit(10)
      .toArray();

    return res.status(200).json({
      items: users.map((u) => ({
        id: u._id.toString(),
        username: u.username || null,
        name: u.name || null,
        avatarUrl: u.avatarUrl || null,
      })),
    });
  } catch (err) {
    console.error("user search error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}