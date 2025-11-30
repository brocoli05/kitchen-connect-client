// pages/api/me.js
import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      id: String(user._id),
      name: user.name || user.username || "User",
      email: user.email,
      following: user.following || [],
      isAdmin:
        user.isAdmin === true ||
        user.isAdmin === "true" ||
        user.role === "admin",
      blockedPosts: user.blockedPosts || [],
      favoritePosts: user.favoritePosts || [],
      history: user.history || [],
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }

    console.error("Get user error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}