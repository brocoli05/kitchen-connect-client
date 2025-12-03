import multer from "multer";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

const upload = multer({
  storage: multer.diskStorage({
    destination: "./public/uploads/profiles",
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) reject(result);
      else resolve(result);
    });
  });
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    await runMiddleware(req, res, upload.single("profileImage"));

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const userObjectId = new ObjectId(userId);

    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    await db
      .collection("users")
      .updateOne({ _id: userObjectId }, { $set: { profileImage: imageUrl } });

    res.status(200).json({ success: true, imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}
