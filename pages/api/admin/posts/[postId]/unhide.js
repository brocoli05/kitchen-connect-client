// pages/api/admin/posts/[postId]/unhide.js
// Admin unhides a hidden post

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
  // Validate postId
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const adminId = new ObjectId(decoded.userId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Check admin privileges (role === "admin" or isAdmin true/"true")
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

    const postObjectId = new ObjectId(postId);
    const now = new Date();

    // Unhide the post
    const result = await db.collection("posts").updateOne(
      { _id: postObjectId },
      {
        $set: { hidden: false },
        $unset: { hiddenAt: "", hiddenBy: "", hiddenReason: "" },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Log moderation action
    await db.collection("moderationLogs").insertOne({
      postId: postObjectId,
      adminId,
      action: "unhide",
      createdAt: now,
    });

    return res.status(200).json({ message: "Post unhidden", hidden: false });
  } catch (err) {
    console.error("admin unhide post error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}