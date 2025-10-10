// pages/api/comments/[commentId].js (Update/Delete Comment: PUT, DELETE)

import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("kitchen-connect");

  const { commentId } = req.query;

  // Token and User ID validation
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Login required." });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token. Unauthorized." });
  }
  const authenticatedUserId = decoded.userId;

  // ID format validation
  let commentObjectId;
  let userObjectId;
  try {
    commentObjectId = new ObjectId(commentId);
    userObjectId = new ObjectId(authenticatedUserId);
  } catch (e) {
    return res.status(400).json({ message: "Invalid ID format." });
  }

  try {
    // Comment existence and ownership check
    const comment = await db
      .collection("comments")
      .findOne({ _id: commentObjectId });
    if (!comment)
      return res.status(404).json({ message: "Comment not found." });

    if (!comment.userId.equals(userObjectId)) {
      return res
        .status(403)
        .json({ message: "You can only edit or delete your own comments." });
    }

    if (req.method === "PUT") {
      // --- Update (PUT) ---
      const { text } = req.body;
      if (!text)
        return res
          .status(400)
          .json({ message: "Comment text is required for update." });

      await db
        .collection("comments")
        .updateOne(
          { _id: commentObjectId },
          { $set: { text, updatedAt: new Date() } }
        );
      res.status(200).json({ message: "Comment updated successfully." });
    } else if (req.method === "DELETE") {
      // --- Delete (DELETE) ---
      await db.collection("comments").deleteOne({ _id: commentObjectId });
      res.status(200).json({ message: "Comment deleted successfully." });
    } else {
      res.status(405).json({
        message: "Method Not Allowed. Only PUT and DELETE are allowed.",
      });
    }
  } catch (error) {
    console.error("Comment operation error:", error);
    res.status(500).json({ message: "Internal server error occurred." });
  }
}
