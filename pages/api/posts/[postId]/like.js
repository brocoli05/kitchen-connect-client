// pages/api/posts/[postId]/like.js
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const { postId } = req.query;
    const post = await db.collection("posts").findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Simple toggle: if user already liked, unlike
    const userId = decoded.userId;
    const userLikeKey = `likedBy.${userId}`; // track who liked in subfield
    const isLiked = post.likedBy?.[userId];

    const update = isLiked
      ? { $inc: { likeCount: -1 }, $unset: { [userLikeKey]: "" } }
      : { $inc: { likeCount: 1 }, $set: { [userLikeKey]: true } };

    await db.collection("posts").updateOne({ _id: new ObjectId(postId) }, update);

    res.status(200).json({ message: isLiked ? "Unliked" : "Liked", isLiked: !isLiked });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}