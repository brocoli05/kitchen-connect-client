// pages/api/users/blocks.js
// GET: return current user's block lists (posts + users)

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
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

  const me = new ObjectId(decoded.userId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const userDoc = await db.collection("users").findOne(
      { _id: me },
      { projection: { blockedPosts: 1, blockedUsers: 1 } }
    );

    const blockedPosts = Array.isArray(userDoc?.blockedPosts)
      ? userDoc.blockedPosts.map((id) => id.toString())
      : [];
    const blockedUsers = Array.isArray(userDoc?.blockedUsers)
      ? userDoc.blockedUsers.map((id) => id.toString())
      : [];

    return res.status(200).json({
      blockedPosts,
      blockedUsers,
    });
  } catch (err) {
    console.error("get blocks error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}