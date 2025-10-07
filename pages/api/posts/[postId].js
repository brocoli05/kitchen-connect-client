// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB); // kitchen-connect
    const { postId } = req.query;

    // Build query that accepts either ObjectId or string id
    const or = [{ id: postId }];
    if (ObjectId.isValid(postId)) or.push({ _id: new ObjectId(postId) });

    const doc = await db.collection("posts").findOne({ $or: or });
    if (!doc) return res.status(404).json({ message: "Post not found" });

    // Normalize id field for frontend convenience
    const data = {
      id: String(doc._id),
      title: doc.title ?? "",
      content: doc.content ?? "",
      photo: doc.photo ?? "",
      authorId: doc.authorId ?? doc.userId ?? null,
      createdAt: doc.createdAt ?? null,
    };

    return res.status(200).json(data);
  } catch (e) {
    console.error("[GET /api/posts/:postId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
