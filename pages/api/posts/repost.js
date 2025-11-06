// pages/api/posts/repost.js
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const { originalId } = req.body;
  if (!originalId) return res.status(400).json({ message: "Missing original post ID" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const posts = db.collection("posts");

    // Find the original post
    const original = await posts.findOne({ _id: new db.bson.ObjectId(originalId) });
    if (!original) return res.status(404).json({ message: "Original post not found" });

    // Create a new post based on the original
    const newPost = {
      title: `Repost: ${original.title}`,
      content: original.content,
      authorId: decoded.userId,
      createdAt: new Date(),
      photo: original.photo || null,
      timeMax: original.timeMax ?? null,
      difficulty: original.difficulty ?? "",
      dietary: original.dietary ?? "",
      include: original.include ?? "",
      exclude: original.exclude ?? "",
      originalId: original._id,
      isRepost: true,
    };

    // Insert the repost
    const result = await posts.insertOne(newPost);

    // 3️⃣ Increment repostCount on the original post
    await posts.updateOne(
      { _id: original._id },
      { $inc: { repostCount: 1 } }
    );

    return res.status(201).json({
      message: "Reposted successfully!",
      id: String(result.insertedId),
    });
  } catch (err) {
    console.error("Repost error:", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Invalid or expired token" });
    return res.status(500).json({ message: "Internal Server Error" });
  }
}