// pages/api/comments/index.js (Create Comment: POST)

import clientPromise from "../../../lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db("kitchen-connect");

  if (req.method === "POST") {
    // JWT Authentication and User ID extraction
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Login required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid token. Unauthorized." });
    }
    const authenticatedUserId = decoded.userId;
    const { postId, text } = req.body;

    // Input validation
    if (!postId || !text) {
      return res
        .status(400)
        .json({ message: "Post ID and comment text are required." });
    }

    try {
      // Create and insert the new comment with postId
      const newComment = {
        postId: new ObjectId(postId),
        userId: new ObjectId(authenticatedUserId),
        text: text,
        createdAt: new Date(),
      };

      await db.collection("comments").insertOne(newComment);
  try {
        const inserted = await db.collection("comments").findOne({
          postId: newComment.postId,
          userId: newComment.userId,
          text: newComment.text,
          createdAt: newComment.createdAt,
        });

        const commentId = inserted?._id || null;

        // Try to fetch post title for storing in history
        let postTitle = null;
        let postAuthor = null;
        try {
          const post = await db.collection("posts").findOne({ _id: new ObjectId(postId) }, { projection: { title: 1, authorId: 1, userId: 1 } });
          if (post && post.title) postTitle = post.title;
          postAuthor = post?.authorId || post?.userId;
        } catch (e) {
          // ignore
        }

        // Create notification for post author
        if (postAuthor && !new ObjectId(postAuthor).equals(new ObjectId(authenticatedUserId))) {
          try {
            const actingUser = await db.collection("users").findOne({ _id: new ObjectId(authenticatedUserId) }, { projection: { username: 1 } });
            const username = actingUser?.username || 'Someone';
            const message = `${username} commented: "${text}" on your post - "${postTitle || 'Untitled'}"`;
            await db.collection('notifications').insertOne({
              userId: new ObjectId(postAuthor),
              message,
              postId: new ObjectId(postId),
              createdAt: new Date(),
            });
          } catch (e) {
            console.warn("Failed to create comment notification", e);
          }
        }

        if (commentId) {
          try {
            const u = await db.collection("users").findOne({ _id: new ObjectId(authenticatedUserId) }, { projection: { history: 1 } });
            if (!Array.isArray(u?.history)) {
              await db.collection("users").updateOne({ _id: new ObjectId(authenticatedUserId) }, { $set: { history: [] } });
            }
          } catch (e) {
            console.warn("Failed to ensure history array before comment push", e);
          }
          await db.collection("users").updateOne(
            { _id: new ObjectId(authenticatedUserId) },
            {
              $push: {
                history: {
                  $each: [
                    {
                      type: "comment",
                      postId: new ObjectId(postId),
                      commentId: new ObjectId(commentId),
                      text: text,
                      title: postTitle,
                      createdAt: new Date(),
                    },
                  ],
                  $position: 0,
                  $slice: 200,
                },
              },
            }
          );
        }
      } catch (e) {
        console.error("Failed to record comment in history", e);
      }

      res.status(201).json({ message: "Comment successfully posted." });
    } catch (error) {
      console.error("Comment post error:", error);
      res
        .status(500)
        .json({ message: "Failed to post comment due to a server error." });
    }
  } else {
    res
      .status(405)
      .json({ message: "Method Not Allowed. Only POST is allowed." });
  }
}