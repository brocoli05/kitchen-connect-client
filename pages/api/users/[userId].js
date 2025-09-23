// pages/api/users/[userId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB); // "kitchen-connect"

    const { userId } = req.query;

    
    const or = [{ id: userId }];
    if (ObjectId.isValid(userId)) or.push({ _id: new ObjectId(userId) });

    const user = await db.collection("users").findOne({ $or: or });
    if (!user) return res.status(404).json({ message: "User not found" });

    
    const data = {
      id: user.id ?? String(user._id),
      name: user.name ?? null,
      username: user.username ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
    };

    return res.status(200).json(data);
  } catch (e) {
    console.error("[GET /api/users/:userId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
