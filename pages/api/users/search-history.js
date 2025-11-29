import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const MAX_ENTRIES = 25;

export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");
    const users = db.collection("users");
    const userId = new ObjectId(decoded.userId);

    if (req.method === "GET") {
      const doc = await users.findOne(
        { _id: userId },
        { projection: { searchHistory: 1 } }
      );
      return res.status(200).json({
        items: Array.isArray(doc?.searchHistory) ? doc.searchHistory : [],
      });
    }

    if (req.method === "DELETE") {
      await users.updateOne(
        { _id: userId },
        { $set: { searchHistory: [] } }
      );
      return res.status(200).json({ message: "Search history cleared" });
    }

    const { query } = req.body || {};
    if (!query || typeof query !== "string") {
      return res.status(400).json({ message: "Query is required" });
    }

    const normalized = query.trim();
    if (normalized.length < 2) {
      return res.status(400).json({ message: "Query must be at least 2 characters" });
    }

    // Remove duplicates then push to front
    await users.updateOne(
      { _id: userId },
      { $pull: { searchHistory: { query: normalized } } }
    );

    await users.updateOne(
      { _id: userId },
      {
        $push: {
          searchHistory: {
            $each: [{ query: normalized, createdAt: new Date() }],
            $position: 0,
            $slice: MAX_ENTRIES,
          },
        },
      }
    );

    return res.status(201).json({ message: "Recorded" });
  } catch (error) {
    console.error("[users/search-history]", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
