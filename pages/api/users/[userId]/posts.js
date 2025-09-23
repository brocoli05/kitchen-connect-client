// pages/api/users/[userId]/posts.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB); // "kitchen-connect"

    const { userId } = req.query;

    const or = [{ authorId: userId }];
    if (ObjectId.isValid(userId)) or.push({ authorId: new ObjectId(userId) });

    const posts = await db
      .collection("posts")
      .find({ $or: or })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .toArray();

    const items = posts.map((p) => ({
      id: p.id ?? String(p._id),
      title: p.title ?? "",
      content: p.content ?? "",
      excerpt:
        p.excerpt ??
        (p.content ? String(p.content).slice(0, 120) : ""),
      authorId:
        typeof p.authorId === "object" ? String(p.authorId) : p.authorId,
      authorName: p.authorName ?? null,
      imageUrl: p.imageUrl ?? null,
      createdAt: p.createdAt ?? null,
    }));

    return res.status(200).json({ items });
  } catch (e) {
    console.error("[GET /api/users/:userId/posts]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
