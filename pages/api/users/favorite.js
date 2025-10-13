// pages/api/users/favorite
// PURPOSE: get all posts that the logged in user saved as favorites

import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
    if(req.method !== 'GET'){
      return res.status(405).json({message: "Method Not Allowed"});
    }

    const token = req.headers.authorization?.split(" ")[1];
    if(!token){
      return res.status(401).json({message: "No token provided"});
    }

    try{
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const client = await clientPromise;
      const db = client.db("kitchen-connect");

      const user = await db.collection("users").findOne({_id: new ObjectId(decoded.userId)});

      if (!user || !user.favoritePosts || user.favoritePosts.length === 0){
        return res.status(200).json([]) // empty array meaning no favorite posts 
      }

      const favoritesIds = user.favoritePosts.map((id)=> new ObjectId(id));
      const posts = await db.collection("posts").find({_id: {$in: favoritesIds}}).toArray();
      res.status(200).json(posts);
    }
    catch(error){
        console.error("Favorite Posts Error", error);
        res.status(500).json({message: "Internal Server Error"})
    }
}