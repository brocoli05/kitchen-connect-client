// pages/api/posts/postId/isFavorite
// PURPOSE: check to see if the logged in user has saved that specific post

import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import FavoritePosts from "@/pages/posts/favorite";

export default async function handler(req,res){
    if(req.method !== 'GET'){
      return res.status(405).json({message: "Method Not Allowed"});
    }

    const token = req.headers.authorization?.split(" ")[1];
    if(!token){
      return res.status(200).json({isFavorited : false});
    }

    try{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const client = await clientPromise;
      const db = client.db("kitchen-connect");
      const userId = decoded.userId;
      const {postId} = req.query;

      if(!postId){
        return res.status(400).json({message:"Post ID is required"});
      }

      const user = await db.collection("users").findOne(
        {_id: new ObjectId(userId)},
        {projection: {favoritePosts: 1}}
      );

      let isFavorited = false;
      if (user && user.FavoritePosts && Array.isArray(user.favoritePosts)){
        const postObjectId = new ObjectId(postId);
        isFavorited = user.FavoritePosts.some((favId)=>favId.equals(postObjectId));
      }
      return res.status(200).json({isFavorited});
    }
    catch(error){
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
        return res.status(200).json({isFavorited: false});
    }

    console.error("isFavorite API error: ", error);
    res.status(500).json({ message: "Internal Server Error" });
    }
}