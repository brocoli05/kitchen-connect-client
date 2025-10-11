// pages/api/users/[userId]/posts.js
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
export default async function handler(req, res) {
	// Connect to database
	const client = await clientPromise;
	const db = client.db(process.env.MONGODB_DB || "kitchen-connect");

  if (req.method !== "POST") return res.status(405).end();

  try {
    const token = req.headers.authorization?.split(" ")[1];
	if (!token) return res.status(401).json({ message: "Unauthorized" });
	let decoded;
	try {
		decoded = jwt.verify(token, process.env.JWT_SECRET);
	} catch (err) {
		return res.status(401).json({ message: "Unauthorized: Invalid token" });
	}
	const currentUserId = decoded.userId;
	const { userId } = req.query;

	await db.collection("users").updateOne(
		{ _id: new ObjectId(currentUserId) },
		{ $pull: { following: userId } }  // $pull removes the userId from the following array
	);

	return res.status(200).json({ message: "Successfully unfollowed user" });

  } catch (e) {
    console.error("[GET /api/users/:userId/posts]", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
