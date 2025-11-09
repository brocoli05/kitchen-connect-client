// pages/api/google-login.js

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import clientPromise from "../../lib/mongodb";
import { ObjectId } from "mongodb";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined in your environment variables.");
}

function generateAppToken(userId) {
  const payloadId = typeof userId === "string" ? new ObjectId(userId) : userId;
  return jwt.sign({ userId: payloadId }, JWT_SECRET, { expiresIn: "1h" });
}

async function findOrCreateUser(email, name, googleId) {
  const mongoClient = await clientPromise;
  const db = mongoClient.db("kitchen-connect");
  const usersCollection = db.collection("users");
  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    return {
      userId: existingUser._id.toString(),
      userName: existingUser.name || name, // Use existing name or Google name
    };
  } else {
    // User NOT Found: Create a new user record (Social Sign-Up)
    const newUser = {
      email: email,
      name: name,
      googleId: googleId,
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    return {
      userId: result.insertedId.toString(),
      userName: name,
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { googleToken } = req.body;

  if (!googleToken) {
    return res.status(400).json({ message: "Google ID Token is missing." });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const googleUserId = payload["sub"]; // Google User ID
    const userEmail = payload.email;
    const userName = payload.name;

    if (!userEmail) {
      return res
        .status(400)
        .json({ message: "Email address not found in Google payload." });
    }

    const user = await findOrCreateUser(userEmail, userName, googleUserId);

    const internalToken = generateAppToken(user.userId);

    return res.status(200).json({
      token: internalToken,
      message: "Google login successful",
      user: {
        id: user.userId,
        name: user.userName,
        email: userEmail,
      },
    });
  } catch (error) {
    console.error("Authentication Error:", error.message);

    if (error.message.includes("Invalid ID Token")) {
      return res
        .status(401)
        .json({ message: "Authentication failed: Invalid Google ID Token." });
    }

    return res
      .status(500)
      .json({ message: "Internal server error during login." });
  }
}
