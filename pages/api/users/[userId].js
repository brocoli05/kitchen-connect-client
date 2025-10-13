// pages/api/users/[userId].js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper: allow both ObjectId and string id
function userMatch(userId) {
  if (ObjectId.isValid(userId)) {
    return { _id: new ObjectId(userId) };
  }
  return { _id: userId };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const { userId } = req.query;
    const user = await db.collection("users").findOne(userMatch(userId), {
      projection: {
        // never return password/hash
        password: 0,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Shape response to a stable schema
    const data = {
      id: user.id ?? String(user._id),
      username: user.username ?? null,
      name: user.name ?? null,
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? "/avatar.png",
      createdAt: user.createdAt ?? null,
      following: user.following ?? [],
    };

    return res.status(200).json(data);
  } catch (e) {
    console.error("[GET /api/users/:userId]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
