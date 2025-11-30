import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const coll = db.collection("posts");

    const items = await coll
      .find({})
      .sort({ likeCount: -1, createdAt: -1 })
      .toArray();

    const normalized = items.map((d) => ({
      ...d,
      id: String(d._id),
    }));

    return res.status(200).json({
      items: normalized,
      total: normalized.length,
    });
  } catch (e) {
    console.error("[/api/posts/trending] error:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
