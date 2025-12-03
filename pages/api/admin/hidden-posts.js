// pages/api/admin/hidden-posts.js
// GET: list posts that have been reported (for admin review)

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

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // 1) Check admin
    const me = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { isAdmin: 1, role: 1 } }
    );

    const isAdmin =
      me &&
      (me.isAdmin === true ||
        me.isAdmin === "true" ||
        me.role === "admin");

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    // 2) Load report documents (only user reports)
    const reportsColl = db.collection("reports");

    const reportDocs = await reportsColl
      .find({
        source: "report",        // only user reports, not blocks
        // status: "open",       
      })
      .sort({ createdAt: -1 })
      .limit(300)
      .toArray();

    if (reportDocs.length === 0) {
      return res.status(200).json({ items: [] });
    }

    // 3) Collect unique postIds from reports
    const postIdStrings = [
      ...new Set(
        reportDocs
          .map((r) => r.postId)
          .filter(Boolean)
          .map((id) => String(id))
      ),
    ];

    const postObjectIds = postIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    if (postObjectIds.length === 0) {
      return res.status(200).json({ items: [] });
    }

    // 4) Load posts for those IDs
    const postsColl = db.collection("posts");

    const postDocs = await postsColl
      .find({ _id: { $in: postObjectIds } })
      .toArray();

    if (postDocs.length === 0) {
      return res.status(200).json({ items: [] });
    }

    // 5) Load authors for display
    const authorIdStrings = [
      ...new Set(
        postDocs
          .map((p) => p.authorId)
          .filter(Boolean)
          .map(String)
      ),
    ];

    const authorObjectIds = authorIdStrings
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    const authors = await db
      .collection("users")
      .find(
        { _id: { $in: authorObjectIds } },
        { projection: { name: 1, username: 1 } }
      )
      .toArray();

    const authorMap = new Map(authors.map((u) => [String(u._id), u]));

    // 6) Pick a representative report (latest) per post for reason
    const reportMap = new Map(); // postId(string) -> reportDoc
    for (const r of reportDocs) {
      const key = String(r.postId);
      // first time or newer one (createdAt)
      if (!reportMap.has(key)) {
        reportMap.set(key, r);
      } else {
        const existing = reportMap.get(key);
        if (
          r.createdAt &&
          (!existing.createdAt ||
            new Date(r.createdAt) > new Date(existing.createdAt))
        ) {
          reportMap.set(key, r);
        }
      }
    }

    // 7) Build response items
    const items = postDocs.map((p) => {
      const authorDoc = authorMap.get(String(p.authorId));
      const authorName =
        authorDoc?.name || authorDoc?.username || "Unknown";

      const r = reportMap.get(String(p._id));
      const hiddenAt = p.hiddenAt || r?.createdAt || p.updatedAt || p.createdAt || null;
      const hiddenReason = p.hiddenReason || r?.reason || null;

      return {
        id: String(p._id),
        title: p.title || "(no title)",
        authorName,
        hiddenAt,
        hiddenReason,
      };
    });

    // Optional: sort items by hiddenAt desc
    items.sort((a, b) => {
      const ta = a.hiddenAt ? new Date(a.hiddenAt).getTime() : 0;
      const tb = b.hiddenAt ? new Date(b.hiddenAt).getTime() : 0;
      return tb - ta;
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("admin hidden-posts error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}