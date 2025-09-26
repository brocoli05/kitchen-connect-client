// pages/api/users/suggested/posts.js
import clientPromise from "../../../../lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Get random posts from all users
    const posts = await db
      .collection("posts")
      .aggregate([
        { $sample: { size: 1 } }, 
        { $sort: { createdAt: -1 } }
      ])
      .toArray();

    const items = posts.map((p) => ({
      id: p.id ?? String(p._id),
      title: p.title ?? "",
      content: p.content ?? "",
      excerpt: p.excerpt ?? (p.content ? String(p.content).slice(0, 120) : ""),
      authorId: p.authorId,
      createdAt: p.createdAt,
      photo: p.photo // need to add later
    }));

    res.status(200).json({ items });
  } catch (error) {
    console.error("Suggested posts error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}