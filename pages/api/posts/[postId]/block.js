// pages/api/posts/[postId]/block.js
// POST: toggle block for a post or its author

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

  const { postId } = req.query;
  if (!postId || postId.length !== 24) {
    return res.status(400).json({ message: "Invalid postId" });
  }

  const { scope } = req.body || {};
  // scope can be "post" or "author"
  if (scope !== "post" && scope !== "author") {
    return res.status(400).json({ message: "Scope must be 'post' or 'author'" });
  }

  const me = new ObjectId(decoded.userId);
  const postObjectId = new ObjectId(postId);

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const usersColl = db.collection("users");
    const postsColl = db.collection("posts");

    // Ensure user document exists and has blocked arrays
    await usersColl.updateOne(
      { _id: me },
      {
        $setOnInsert: {
          blockedPosts: [],
          blockedUsers: [],
        },
      },
      { upsert: true }
    );

    const userDoc = await usersColl.findOne(
      { _id: me },
      { projection: { blockedPosts: 1, blockedUsers: 1 } }
    );

    const blockedPosts = Array.isArray(userDoc?.blockedPosts)
      ? userDoc.blockedPosts.map((id) => id.toString())
      : [];
    const blockedUsers = Array.isArray(userDoc?.blockedUsers)
      ? userDoc.blockedUsers.map((id) => id.toString())
      : [];

    let targetUserId = null;

    if (scope === "author") {
      const postDoc = await postsColl.findOne(
        { _id: postObjectId },
        { projection: { authorId: 1 } }
      );

      if (!postDoc) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (!postDoc.authorId) {
        return res.status(400).json({ message: "Post has no authorId" });
      }

      targetUserId = new ObjectId(postDoc.authorId);
    }

    let update;
    let blockedNow = false;

    if (scope === "post") {
      const isBlocked = blockedPosts.includes(postObjectId.toString());
      if (isBlocked) {
        // unblock post
        update = { $pull: { blockedPosts: postObjectId } };
        blockedNow = false;
      } else {
        // block post
        update = { $addToSet: { blockedPosts: postObjectId } };
        blockedNow = true;
      }
    } else {
      const isBlocked = blockedUsers.includes(targetUserId.toString());
      if (isBlocked) {
        update = { $pull: { blockedUsers: targetUserId } };
        blockedNow = false;
      } else {
        update = { $addToSet: { blockedUsers: targetUserId } };
        blockedNow = true;
      }
    }

    await usersColl.updateOne({ _id: me }, update);

    return res.status(200).json({
      scope,
      blocked: blockedNow,
    });
  } catch (err) {
    console.error("block post/author error", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}