import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const userObjectId = new ObjectId(userId);
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    if (req.method === "GET") {
      // Get user profile
      const user = await db.collection("users").findOne({ _id: userObjectId });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        id: String(user._id),
        username: user.username,
        email: user.email,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
      });
    } else if (req.method === "PUT") {
      // Update user profile
      const { firstName, lastName, phone, email } = req.body;

      // Validation functions
      const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      const validatePhone = (phone) => {
        // Remove all non-digit characters except + at the beginning
        const cleanPhone = phone.replace(/[^\d+]/g, "");

        // Canadian phone numbers: 10 digits, area codes 204, 226, 236, 249, 250, 289, 306, 343, 365, 403, 416, 418, 431, 437, 438, 450, 506, 514, 519, 548, 579, 581, 587, 604, 613, 639, 647, 672, 705, 709, 742, 778, 780, 782, 807, 819, 825, 867, 873, 902, 905
        const canadianAreaCodes = [
          204, 226, 236, 249, 250, 289, 306, 343, 365, 403, 416, 418, 431, 437,
          438, 450, 506, 514, 519, 548, 579, 581, 587, 604, 613, 639, 647, 672,
          705, 709, 742, 778, 780, 782, 807, 819, 825, 867, 873, 902, 905,
        ];

        if (cleanPhone.startsWith("+1")) {
          // +1 followed by 10 digits (North American format)
          const phoneDigits = cleanPhone.substring(2);
          if (phoneDigits.length === 10) {
            const areaCode = parseInt(phoneDigits.substring(0, 3));
            return (
              canadianAreaCodes.includes(areaCode) &&
              /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(phoneDigits)
            );
          }
        } else if (cleanPhone.startsWith("+")) {
          // Other international numbers
          return (
            cleanPhone.length >= 11 &&
            cleanPhone.length <= 16 &&
            /^(\+\d{1,3})?[1-9]\d{8,14}$/.test(cleanPhone)
          );
        } else {
          // Default to Canadian format (10 digits)
          if (cleanPhone.length === 10) {
            const areaCode = parseInt(cleanPhone.substring(0, 3));
            return (
              canadianAreaCodes.includes(areaCode) &&
              /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(cleanPhone)
            );
          }
        }

        return false;
      };

      const validateName = (name) => {
        // Names should be 1-50 characters, letters, spaces, hyphens, apostrophes only
        const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
        return nameRegex.test(name);
      };

      // Validate inputs
      if (email && !validateEmail(email)) {
        return res
          .status(400)
          .json({ message: "Please enter a valid email address" });
      }

      if (phone && phone.trim() !== "" && !validatePhone(phone)) {
        return res.status(400).json({
          message:
            "Please enter a valid Canadian phone number (10 digits with valid area code, or international format)",
        });
      }

      if (firstName && firstName.trim() !== "" && !validateName(firstName)) {
        return res.status(400).json({
          message:
            "First name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes",
        });
      }

      if (lastName && lastName.trim() !== "" && !validateName(lastName)) {
        return res.status(400).json({
          message:
            "Last name must be 1-50 characters and contain only letters, spaces, hyphens, and apostrophes",
        });
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await db.collection("users").findOne({
          email: email,
          _id: { $ne: userObjectId },
        });

        if (existingUser) {
          return res.status(409).json({
            message: "Email is already registered to another account",
          });
        }
      }

      // Build update object with only provided fields
      const updateFields = {};
      if (firstName !== undefined) updateFields.firstName = firstName.trim();
      if (lastName !== undefined) updateFields.lastName = lastName.trim();
      if (phone !== undefined) updateFields.phone = phone.trim();
      if (email !== undefined) updateFields.email = email.toLowerCase().trim();
      updateFields.updatedAt = new Date();

      const result = await db
        .collection("users")
        .updateOne({ _id: userObjectId }, { $set: updateFields });

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return updated user data
      const updatedUser = await db
        .collection("users")
        .findOne({ _id: userObjectId });

      res.status(200).json({
        id: String(updatedUser._id),
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        phone: updatedUser.phone || "",
      });
    } else if (req.method === "DELETE") {
      const deleteUserResult = await db
        .collection("users")
        .deleteOne({ _id: userObjectId });

      if (deleteUserResult.deletedCount === 0) {
        return res.status(404).json({ message: "User not found." });
      }

      // Delete all associated data
      await db.collection("posts").deleteMany({ userId: userObjectId });
      await db.collection("comments").deleteMany({ userId: userObjectId });
      await db.collection("favorites").deleteMany({ userId: userObjectId });
      await db.collection("messages").deleteMany({ userId: userObjectId });
      await db.collection("reposts").deleteMany({ userId: userObjectId });

      return res.status(200).json({ message: "Account successfully deleted." });
    } else {
      res.status(405).json({ message: "Method not allowed" });
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

    console.error("Profile API error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
