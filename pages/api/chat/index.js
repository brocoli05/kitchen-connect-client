// pages/api/chat/index.js
// Returns conversation list for current user (one row per peer)

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

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = new ObjectId(decoded.userId);

    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const coll = db.collection("messages");

    // Get all messages involving this user, newest first
    const msgs = await coll
      .find({
        $or: [{ userA: userId }, { userB: userId }],
      })
      .sort({ createdAt: -1 })
      .toArray();

    const byPeer = new Map();

    for (const m of msgs) {
      const other =
        m.userA.toString() === userId.toString() ? m.userB.toString() : m.userA.toString();

      if (!byPeer.has(other)) {
        byPeer.set(other, {
          peerId: other,
          lastText: m.text,
          lastAt: m.createdAt,
          unreadCount: 0,
        });
      }

      // Count unread messages (only messages from peer)
      const isFromPeer = m.sender.toString() === other;
      const alreadyRead = Array.isArray(m.readBy)
        ? m.readBy.map((x) => x.toString()).includes(userId.toString())
        : false;
      if (isFromPeer && !alreadyRead) {
        const entry = byPeer.get(other);
        entry.unreadCount += 1;
      }
    }

    const peerIds = Array.from(byPeer.keys()).map((id) => new ObjectId(id));
    const users = await db
      .collection("users")
      .find({ _id: { $in: peerIds } })
      .project({ username: 1, name: 1, avatarUrl: 1 })
      .toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const items = Array.from(byPeer.values()).map((c) => {
      const u = userMap.get(c.peerId);
      return {
        peerId: c.peerId,
        username: u?.username || null,
        name: u?.name || null,
        avatarUrl: u?.avatarUrl || null,
        lastText: c.lastText,
        lastAt: c.lastAt,
        unreadCount: c.unreadCount,
      };
    });

    return res.status(200).json({ items });
  } catch (err) {
    console.error("chat list error", err);
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    return res.status(500).json({ message: "Internal Server Error" });
  }
}