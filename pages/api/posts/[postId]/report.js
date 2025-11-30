// pages/api/posts/[postId]/report.js
// POST: report a post -> hide globally + create moderation entry

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
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Validate postId
  const { postId } = req.query;
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const reporterId = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);
  const { reason, details } = req.body || {};

  // Reason is required for a report
  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: "Reason is required" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Make sure post exists
    const postDoc = await db
      .collection("posts")
      .findOne({ _id: postObjectId }, { projection: { authorId: 1 } });

    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    const reportedUserId = postDoc.authorId
      ? new ObjectId(postDoc.authorId)
      : null;

    // Prevent the same user from reporting the same post multiple times
    const existing = await db.collection("reports").findOne({
      postId: postObjectId,
      reporterId,
    });

    if (existing) {
      return res.status(409).json({
        message: "You already reported this post.",
        alreadyReported: true,
      });
    }

    const now = new Date();

    // 1) Insert the report document
    await db.collection("reports").insertOne({
      postId: postObjectId,
      reporterId,
      reportedUserId,
      reason: String(reason).trim(),
      details: details ? String(details).trim() : null,
      createdAt: now,
      status: "open",
      source: "report",
    });

    // 2) Hide the post globally while it is under review
    await db.collection("posts").updateOne(
      { _id: postObjectId },
      {
        $set: {
          hidden: true,
          hiddenReason: "report",
          hiddenAt: now,
        },
      }
    );

    return res.status(201).json({
      message: "Report submitted and post hidden for review.",
      reported: true,
      hidden: true,
    });
  } catch (err) {
    console.error("report post error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}