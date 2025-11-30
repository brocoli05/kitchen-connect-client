import clientPromise from "../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  const { notificationId } = req.query;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!notificationId || !ObjectId.isValid(notificationId)) {
    return res.status(400).json({ message: 'Invalid notification ID' });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const client = await clientPromise;
    const db = client.db("kitchen-connect");

    const result = await db.collection('notifications').deleteOne({
      _id: new ObjectId(notificationId),
      userId: new ObjectId(decoded.userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}