// pages/api/posts/create.js

import jwt from "jsonwebtoken";
import clientPromise from "../../../lib/mongodb";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const form = new formidable.IncomingForm({ multiples: false });
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("form parse error", err);
        return res.status(500).json({ message: "Could not parse form" });
      }

      const title = fields.title;
      const content = fields.content;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content are required" });
      }

      let photoPath = fields.photo || null;

      if (files.photo) {
        const file = files.photo;
        const ext = path.extname(file.originalFilename || file.newFilename || file.name || "") || ".jpg";
        const fileName = `${uuidv4()}${ext}`;
        const dest = path.join(uploadDir, fileName);
        try {
          fs.renameSync(file.filepath, dest);
          photoPath = `/uploads/${fileName}`;
        } catch (e) {
          console.error("Failed to move uploaded file", e);
        }
      }

      const client = await clientPromise;
      const db = client.db("kitchen-connect");

      const newPost = {
        title: title.trim(),
        content: content.trim(),
        photo: photoPath,
        authorId: decoded.userId,
        createdAt: new Date(),
      };

      await db.collection("posts").insertOne(newPost);
      res.status(201).json({ message: "Post created successfully", photo: photoPath });
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }

    console.error("Create post error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
