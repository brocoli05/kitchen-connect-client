import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    // Get token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const userObjectId = new ObjectId(userId);

    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    // Find user
    const user = await db.collection("users").findOne({ _id: userObjectId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Google login accounts cannot change password
    if (user.googleId) {
      return res.status(403).json({
        message: "Password change is not available for Google accounts.",
      });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required." });
    }

    // Check current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res
        .status(400)
        .json({ message: "Current password is incorrect." });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as current password.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in DB
    await db
      .collection("users")
      .updateOne(
        { _id: userObjectId },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
      );

    return res.status(200).json({ message: "Password updated successfully!" });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Invalid or expired token" });
    }
    console.error("Change Password API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
