// pages/api/chat/[peerId].js
// GET: list messages with a peer
// POST: send new message to peer

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const token = auth?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { peerId } = req.query;
  if (!peerId || peerId.length !== 24) {
    return res.status(400).json({ message: "Invalid peerId" });
  }

  const me = new ObjectId(decoded.userId);
  const peer = new ObjectId(peerId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    const coll = db.collection("messages");

    if (req.method === "GET") {
      // Find messages between two users
      const messages = await coll
        .find({
          $or: [
            { userA: me, userB: peer },
            { userA: peer, userB: me },
          ],
        })
        .sort({ createdAt: 1 })
        .toArray();

      // Mark peer messages as read
      await coll.updateMany(
        {
          $or: [
            { userA: me, userB: peer },
            { userA: peer, userB: me },
          ],
          sender: peer,
          readBy: { $ne: me },
        },
        { $addToSet: { readBy: me } }
      );

      const peerUser = await db
        .collection("users")
        .findOne(
          { _id: peer },
          { projection: { username: 1, name: 1, avatarUrl: 1 } }
        );

      return res.status(200).json({
        peer: peerUser
          ? {
              id: peerUser._id.toString(),
              username: peerUser.username || null,
              name: peerUser.name || null,
              avatarUrl: peerUser.avatarUrl || null,
            }
          : null,
        items: messages.map((m) => ({
          id: m._id.toString(),
          text: m.text,
          senderId: m.sender.toString(),
          createdAt: m.createdAt,
        })),
      });
    }

    if (req.method === "POST") {
      const { text } = req.body || {};
      if (!text || !String(text).trim()) {
        return res.status(400).json({ message: "Text is required" });
      }

      const now = new Date();
      const doc = {
        userA:
          me.toString() < peer.toString()
            ? me
            : peer,
        userB:
          me.toString() < peer.toString()
            ? peer
            : me,
        sender: me,
        text: String(text).trim(),
        createdAt: now,
        readBy: [me],
      };

      const result = await coll.insertOne(doc);

      return res.status(201).json({
        id: result.insertedId.toString(),
        text: doc.text,
        senderId: me.toString(),
        createdAt: now,
      });
    }

    return res.status(405).json({ message: "Method Not Allowed" });
  } catch (err) {
    console.error("chat peer error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}