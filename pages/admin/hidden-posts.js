// pages/api/admin/hidden-posts.js
// GET: list posts that are hidden from public (for admin review)

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const auth = req.headers.authorization;
  const token = auth?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const me = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { isAdmin: 1, role: 1 } }
      );

    const isAdmin =
      me &&
      (me.isAdmin === true ||
        me.isAdmin === "true" ||
        me.role === "admin");

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    const postsColl = db.collection("posts");

    const hiddenDocs = await postsColl
      .find({ hidden: true })
      .sort({ hiddenAt: -1, createdAt: -1 })
      .limit(200)
      .toArray();

    if (hiddenDocs.length === 0) {
      return res.status(200).json({ items: [] });
    }

    
    const authorIdStrings = [
      ...new Set(
        hiddenDocs
          .map((p) => p.authorId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const authorObjectIds = authorIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const authors = await db
      .collection("users")
      .find(
        { _id: { $in: authorObjectIds } },
        { projection: { name: 1, username: 1 } }
      )
      .toArray();

    const authorMap = new Map(
      authors.map((u) => [String(u._id), u])
    );

    const items = hiddenDocs.map((p) => {
      const authorDoc = authorMap.get(String(p.authorId));
      const authorName =
        authorDoc?.name || authorDoc?.username || "Unknown";

      return {
        id: String(p._id),
        title: p.title || "(no title)",
        authorName,
        hiddenAt: p.hiddenAt || p.updatedAt || p.createdAt || null,
        hiddenReason: p.hiddenReason || null,
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("admin hidden-posts error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}