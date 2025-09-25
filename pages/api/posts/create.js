// pages/api/posts/create.js

import jwt from "jsonwebtoken";
import { connectDB } from "../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { title, content } = req.body;

    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const newPost = {
      title,
      content,
      authorId: decoded.userId,
      createdAt: new Date(),
    };

    await db.collection("posts").insertOne(newPost);
    res.status(201).json({ message: "Post created successfully" });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
