// pages/api/comments/index.js (Create Comment: POST)

import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("kitchen-connect");

  if (req.method === "POST") {
    // JWT Authentication and User ID extraction
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Login required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid token. Unauthorized." });
    }
    const authenticatedUserId = decoded.userId;
    const { postId, text } = req.body;

    // Input validation
    if (!postId || !text) {
      return res
        .status(400)
        .json({ message: "Post ID and comment text are required." });
    }

    try {
      // Create and insert the new comment with postId
      const newComment = {
        postId: new ObjectId(postId),
        userId: new ObjectId(authenticatedUserId),
        text: text,
        createdAt: new Date(),
      };

      await db.collection("comments").insertOne(newComment);
      res.status(201).json({ message: "Comment successfully posted." });
    } catch (error) {
      console.error("Comment post error:", error);
      res
        .status(500)
        .json({ message: "Failed to post comment due to a server error." });
    }
  } else {
    res
      .status(405)
      .json({ message: "Method Not Allowed. Only POST is allowed." });
  }
}
