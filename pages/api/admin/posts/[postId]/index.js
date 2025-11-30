// pages/api/admin/posts/[postId]/index.js
// GET: return full post info + reports for admin review

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  // Only allow GET for this endpoint
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // Read bearer token
  const auth = req.headers.authorization;
  const token = auth?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { postId } = req.query;
  // Validate postId
  if (!postId || !ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const adminId = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Check admin privileges
    const adminUser = await db
      .collection("users")
      .findOne(
        { _id: adminId },
        { projection: { role: 1, isAdmin: 1 } }
      );

    const isAdmin =
      adminUser &&
      (adminUser.role === "admin" ||
        adminUser.isAdmin === true ||
        adminUser.isAdmin === "true");

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access only" });
    }

    // Load post (even if hidden)
    const postDoc = await db.collection("posts").findOne({ _id: postObjectId });

    if (!postDoc) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Look up author
    let authorName = "Unknown";
    if (postDoc.authorId && ObjectId.isValid(postDoc.authorId)) {
      const author = await db
        .collection("users")
        .findOne(
          { _id: new ObjectId(postDoc.authorId) },
          { projection: { name: 1, username: 1 } }
        );
      if (author) {
        authorName = author.name || author.username || "Unknown";
      }
    }

    // Load reports for this post
    const reportsDocs = await db
      .collection("reports")
      .find({ postId: postObjectId })
      .sort({ createdAt: -1 })
      .toArray();

    // Resolve reporter names
    const reporterIds = [
      ...new Set(
        reportsDocs
          .map((r) => r.reporterId)
          .filter(Boolean)
          .map(String)
      ),
    ]
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));

    let reporterMap = new Map();
    if (reporterIds.length > 0) {
      const reporters = await db
        .collection("users")
        .find(
          { _id: { $in: reporterIds } },
          { projection: { name: 1, username: 1 } }
        )
        .toArray();
      reporterMap = new Map(
        reporters.map((u) => [
          String(u._id),
          u.name || u.username || "Unknown",
        ])
      );
    }

    const post = {
      id: String(postDoc._id),
      title: postDoc.title || "(no title)",
      content: postDoc.content || "",
      photo: postDoc.photo || null,
      createdAt: postDoc.createdAt || null,
      hiddenAt: postDoc.hiddenAt || null,
      hiddenReason: postDoc.hiddenReason || null,
      authorName,
    };

    const reports = reportsDocs.map((r) => ({
      id: String(r._id),
      reason: r.reason || "",
      details: r.details || null,
      status: r.status || "open",
      source: r.source || null,
      createdAt: r.createdAt || null,
      reporterName:
        reporterMap.get(String(r.reporterId)) || "Unknown",
    }));

    return res.status(200).json({ post, reports });
  } catch (err) {
    console.error("admin post details error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}