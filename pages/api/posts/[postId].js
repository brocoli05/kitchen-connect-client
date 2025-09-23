// pages/api/posts/[postId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB); // "kitchen-connect"
    const { postId } = req.query;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid postId" });
    }

    const post = await db
      .collection("posts")
      .findOne({ _id: new ObjectId(postId) });

    if (!post) return res.status(404).json({ message: "Post not found" });

    const data = {
      id: String(post._id),
      title: post.title ?? "",
      content: post.content ?? "",
      photo: post.photo ?? null,
      createdAt: post.createdAt ?? null,
    };

    return res.status(200).json(data);
  } catch (e) {
    console.error("[GET /api/posts/:postId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
