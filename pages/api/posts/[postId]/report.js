// pages/api/posts/[postId]/report.js
// POST: report a post for a given reason

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
  if (!postId || postId.length !== 24) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const reporterId = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);

  const { reason, details } = req.body || {};

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ message: "Reason is required" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Ensure the post exists and fetch author
    const postDoc = await db
      .collection("posts")
      .findOne({ _id: postObjectId }, { projection: { authorId: 1 } });

    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    const reportedUserId = postDoc.authorId
      ? new ObjectId(postDoc.authorId)
      : null;

    // Prevent duplicate reports from the same user on the same post
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

    await db.collection("reports").insertOne({
      postId: postObjectId,
      reporterId,
      reportedUserId,
      reason: String(reason).trim(),
      details: details ? String(details).trim() : null,
      createdAt: now,
      status: "open", // for future admin workflow
    });

    return res.status(201).json({
      message: "Report submitted successfully.",
      reported: true,
    });
  } catch (err) {
    console.error("report post error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}