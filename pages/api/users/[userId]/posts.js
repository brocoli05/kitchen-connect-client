// pages/api/users/[userId]/posts.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { userId } = req.query;

    const or = [{ id: userId }];
    if (ObjectId.isValid(userId)) or.push({ _id: new ObjectId(userId) });

    const user = await db.collection("users").findOne({ $or: or }, { projection: { _id: 1 } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const items = await db
      .collection("posts")
      .find({ $or: [{ authorId: String(user._id) }, { userId: String(user._id) }] })
      .sort({ createdAt: -1 })
      .toArray();

    const normalized = items.map((d) => ({
      id: String(d._id),              
      title: d.title ?? "",
      content: d.content ?? "",
      photo: d.photo ?? "",
      createdAt: d.createdAt ?? null,
    }));

    return res.status(200).json({ items: normalized });
  } catch (e) {
    console.error("[GET /api/users/:userId/posts]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
