// pages/api/posts/postId/favorite
// PURPOSE: saves the post in the array in users collection

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req,res){
    if(req.method !== 'POST'){
      return res.status(405).json({message: "Method Not Allowed"});
    }
    
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const client = await clientPromise;
      const db = client.db("kitchen-connect");
      const userId = decoded.userId;
      const {postId} = req.query;
      const postObjectId = new ObjectId(postId);
      const userObjectId = new ObjectId(userId);
      let update, isFavNow;

      if(!postId){
        return res.status(400).json({message: 'Post ID is required'})
      }

      const user = await db.collection("users").findOne(
        {_id: userObjectId, favoritePosts: postObjectId},
        {projection: {_id: 1}}
      )

      if(user){
        update = {$pull:{favoritePosts: postObjectId}};
        isFavNow = false;
      }
      else{
        update = {$addToSet: {favoritePosts : postObjectId}};
        isFavNow = true;
      }

      const result = await db.collection("users").updateOne({_id: userObjectId}, update);
      try {
        const u = await db.collection("users").findOne({ _id: userObjectId }, { projection: { history: 1 } });
        if (!Array.isArray(u?.history)) {
          await db.collection("users").updateOne({ _id: userObjectId }, { $set: { history: [] } });
        }
      } catch (e) {
        console.warn("Failed to ensure history array before favorite push", e);
      }
      try {
        const postDoc = await db.collection("posts").findOne({ _id: postObjectId }, { projection: { title: 1 } });
        const title = postDoc?.title || null;

        if (isFavNow) {
          await db.collection("users").updateOne(
            { _id: userObjectId },
            {
              $push: {
                history: {
                  $each: [
                    {
                      type: "favorite",
                      postId: postObjectId,
                      text: null,
                      title,
                      createdAt: new Date(),
                    },
                  ],
                  $position: 0,
                  $slice: 200,
                },
              },
            }
          );
        } else {
          await db.collection("users").updateOne(
            { _id: userObjectId },
            {
              $push: {
                history: {
                  $each: [
                    {
                      type: "unsaved",
                      postId: postObjectId,
                      text: null,
                      title,
                      createdAt: new Date(),
                    },
                  ],
                  $position: 0,
                  $slice: 200,
                },
              },
            }
          );
        }
      } catch (e) {
        console.error("Failed to record favorite/unsave in history", e);
      }

      res.status(200).json({isFavorited: isFavNow, message: isFavNow ? "Post Saved" : "Post Unsaved"});
    }catch(error){
      if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
      ) {
          return res.status(401).json({message: "Unauthorized: Invalid or expired token" });
      }
      console.error("Favorite Toggle API Error", error);
      res.status(500).json({message: "Internal Server Error"})
    }
    
}