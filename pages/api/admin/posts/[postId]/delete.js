// pages/api/admin/posts/[postId]/delete.js
// Admin permanently deletes a post and related data

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Read bearer token
  const auth = req.headers.authorization;
  const token = auth?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { postId } = req.query;
  // Basic validation for postId
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const adminId = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Check that the current user really is admin
    const adminUser = await db.collection("users").findOne(
      { _id: adminId },
      { projection: { role: 1, isAdmin: 1 } }
    );

    const isAdmin =
      adminUser &&
      (adminUser.role === "admin" ||
        adminUser.isAdmin === true ||
        adminUser.isAdmin === "true");

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    const now = new Date();

    // 1) Delete the post document itself
    const deleteResult = await db
      .collection("posts")
      .deleteOne({ _id: postObjectId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 2) Clean up related data (optional but recommended)

    // Remove all reports for this post
    await db.collection("reports").deleteMany({ postId: postObjectId });

    // Remove this post from users' favorites, history, blockedPosts
    await db.collection("users").updateMany(
      {},
      {
        $pull: {
          favoritePosts: postObjectId,
          history: { postId: postObjectId },
          blockedPosts: postObjectId,
        },
      }
    );

    // 3) Write a moderation log entry
    await db.collection("moderationLogs").insertOne({
      postId: postObjectId,
      adminId,
      action: "delete",
      createdAt: now,
    });

    return res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.error("admin delete post error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}