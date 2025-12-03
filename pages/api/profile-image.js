import multer from "multer";
import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

// Use memory storage: parse multipart FormData without writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
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
    // Expect create.js logic: FormData with field 'photo'
    await runMiddleware(req, res, upload.single("photo"));

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userObjectId = new ObjectId(decoded.userId);

    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ success: false, message: "No image uploaded" });
    }

    // Convert the uploaded file to a Data URL to store in DB
    const mime = file.mimetype || "image/jpeg";
    const base64 = file.buffer.toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;

    const client = await clientPromise;
    const db = client.db("kitchen-connect");
    await db.collection("users").updateOne(
      { _id: userObjectId },
      { $set: { profileImage: dataUrl } }
    );

    res.status(200).json({ success: true, imageUrl: dataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
}
