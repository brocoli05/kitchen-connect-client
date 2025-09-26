// pages/api/users/logout.js
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Verify the token is valid 
    jwt.verify(token, process.env.JWT_SECRET);
    
    
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      // Even if token is invalid, we can still logout
      return res.status(200).json({ message: "Logged out successfully" });
    }
    
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}