// pages/api/posts/create.js

import jwt from "jsonwebtoken";
import clientPromise from "../../../lib/mongodb";
import formidable from 'formidable';
import fs from 'fs';

// Disable body parsing for FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    
    // Helper: promisify formidable.parse
    const parseForm = (form, req) =>
      new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve([fields, files]);
        });
      });

    // Check if request has FormData (multipart)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Handle FormData with image upload
      const form = formidable({
        maxFileSize: 5 * 1024 * 1024, // 5MB limit
        allowEmptyFiles: false,
        filter: ({ mimetype }) => mimetype && mimetype.includes('image'),
      });

      const [fields, files] = await parseForm(form, req);

      const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
      const content = Array.isArray(fields.content) ? fields.content[0] : fields.content;
      const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

      const client = await clientPromise;
      const db = client.db("kitchen-connect");

      const newPost = {
        title,
        content,
        authorId: decoded.userId,
        createdAt: new Date(),
      };

      // If image was uploaded, convert to base64 for storage
      if (photoFile) {
        const imageBuffer = fs.readFileSync(photoFile.filepath);
        const base64Image = `data:${photoFile.mimetype};base64,${imageBuffer.toString('base64')}`;
        newPost.photo = base64Image;

        // Clean up temp file
        fs.unlinkSync(photoFile.filepath);
      }

      await db.collection("posts").insertOne(newPost);
      res.status(201).json({ message: "Post created successfully" });
      
    } else {
      // Handle regular JSON request (no image). Since bodyParser is disabled,
      // read raw body and parse JSON manually.
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => resolve(data));
        req.on("error", (err) => reject(err));
      });

      let parsed = {};
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch (err) {
        return res.status(400).json({ message: "Invalid JSON body" });
      }

      const { title, content } = parsed;

      const client = await clientPromise;
      const db = client.db("kitchen-connect");

      const newPost = {
        title,
        content,
        authorId: decoded.userId,
        createdAt: new Date(),
      };

      await db.collection("posts").insertOne(newPost);
      res.status(201).json({ message: "Post created successfully" });
    }
    
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
