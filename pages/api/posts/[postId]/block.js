// pages/api/posts/[postId]/block.js
// POST: block / unblock a post for the current user only

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

  const { postId } = req.query;
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const userId = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Make sure the post exists
    const postDoc = await db
      .collection("posts")
      .findOne({ _id: postObjectId }, { projection: { _id: 1 } });

    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Check if already blocked
    const me = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { blockedPosts: 1 } });

    const alreadyBlocked =
      me?.blockedPosts?.some((id) => String(id) === String(postObjectId)) ||
      false;

    if (alreadyBlocked) {
      // Unblock for this user
      await db.collection("users").updateOne(
        { _id: userId },
        { $pull: { blockedPosts: postObjectId } }
      );

      return res.status(200).json({
        blocked: false,
        message: "Post unblocked for this user.",
      });
    } else {
      // Block for this user
      await db.collection("users").updateOne(
        { _id: userId },
        { $addToSet: { blockedPosts: postObjectId } }
      );

      return res.status(200).json({
        blocked: true,
        message: "Post blocked and will be hidden for this user.",
      });
    }
  } catch (err) {
    console.error("block post error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}