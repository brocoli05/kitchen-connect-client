import clientPromise from "../../../lib/mongodb";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (!['GET', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ message: 'Method not allowed' });
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

    if (req.method === 'DELETE') {
      // Delete all notifications for the user
      const result = await db.collection('notifications').deleteMany({
        userId: new ObjectId(decoded.userId)
      });
      return res.status(200).json({ message: 'All notifications cleared', deletedCount: result.deletedCount });
    }

    const notificationsCollection = db.collection('notifications');
    const notifications = await notificationsCollection
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}