// pages/api/comments.js

import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("kitchen-connect");

  // Create comment
  if (req.method === "POST") {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token provided. Unauthorized." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid token. Unauthorized." });
    }

    const authenticatedUserId = decoded.userId;
    const { recipeId, text } = req.body;

    if (!recipeId || !text) {
      return res
        .status(400)
        .json({ message: "All fields (recipeId, text) are required" });
    }

    try {
      // Convert IDs to MongoDB ObjectId format
      let recipeObjectId;
      let userObjectId;
      try {
        recipeObjectId = new ObjectId(recipeId);
        userObjectId = new ObjectId(authenticatedUserId);
      } catch (e) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      // New comment schema
      const newComment = {
        recipeId: recipeObjectId,
        userId: userObjectId,
        text: text,
        createdAt: new Date(),
      };

      // Insert the new comment
      await db.collection("comments").insertOne(newComment);

      res.status(201).json({ message: "Comment successfully posted" });
    } catch (error) {
      console.error("Comment post error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }

  // Get comments by recipe ID
  else if (req.method === "GET") {
    const { recipeId } = req.query;

    if (!recipeId) {
      return res
        .status(400)
        .json({ message: "recipeId query parameter is required" });
    }

    let recipeObjectId;
    try {
      recipeObjectId = new ObjectId(recipeId);
    } catch (e) {
      return res.status(400).json({ message: "Invalid recipeId format" });
    }

    try {
      // Get comments and join with user data
      const comments = await db
        .collection("comments")
        .aggregate([
          { $match: { recipeId: recipeObjectId } },
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "authorInfo",
            },
          },
          { $unwind: "$authorInfo" },
          { $project: { "authorInfo.password": 0 } },
        ])
        .toArray();

      return res.status(200).json({ comments });
    } catch (error) {
      console.error("Comment fetch error:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } else {
    return res.status(405).json({ message: "Method Not Allowed" });
  }
}
