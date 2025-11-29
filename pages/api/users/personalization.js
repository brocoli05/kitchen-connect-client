import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DEFAULT_SETTINGS = {
  enabled: true,
  fallback: "trending",
};

function normalizeSettings(doc) {
  if (!doc || typeof doc !== "object") return { ...DEFAULT_SETTINGS };
  return {
    enabled: doc.enabled !== false,
    fallback: doc.fallback || DEFAULT_SETTINGS.fallback,
    updatedAt: doc.updatedAt || null,
  };
}

export default async function handler(req, res) {
  if (!["GET", "PUT"].includes(req.method)) {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "kitchen-connect");
    const users = db.collection("users");
    const userId = new ObjectId(decoded.userId);

    const existing = await users.findOne(
      { _id: userId },
      { projection: { personalization: 1 } }
    );
    const currentSettings = normalizeSettings(existing?.personalization);

    if (req.method === "GET") {
      return res.status(200).json(currentSettings);
    }

    const { enabled, fallback } = req.body || {};
    const update = { ...currentSettings };
    let touched = false;

    if (typeof enabled === "boolean" && enabled !== currentSettings.enabled) {
      update.enabled = enabled;
      touched = true;
    }
    if (
      typeof fallback === "string" &&
      fallback.trim() !== "" &&
      fallback !== currentSettings.fallback
    ) {
      update.fallback = fallback.trim();
      touched = true;
    }

    if (!touched) {
      return res.status(200).json(currentSettings);
    }

    update.updatedAt = new Date();

    await users.updateOne(
      { _id: userId },
      { $set: { personalization: update } }
    );

    return res.status(200).json(update);
  } catch (error) {
    console.error("[users/personalization]", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
