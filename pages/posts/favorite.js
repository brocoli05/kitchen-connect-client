import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import api from "@/utils/api";
import Link from "next/link";

export default function FavoritePosts(){
    const [posts,setPosts] = useState([]);
    const router = useRouter();

    useEffect(()=>{
      const getFavorites = async () => {
        const token = localStorage.getItem("userToken");
          if(!token){
            router.push("/");
            return;
          }
          try{
            const res = await api.get("/users/favorite",
                {headers: {Authorization: `Bearer ${token}`}
          });
          setPosts(res.data || []);
          }
          catch(error){
            console.error("Failed to get favorite posts", error);
          }
        };
        getFavorites();
    },[router]);


    return(
      <>
        <div style={{padding: "20px"}}>
          <Link href="/">← Back</Link>
        </div>
        <div style={{paddingLeft: "40px", paddingRight: "40px", paddingBottom: "40px"}}>
          <h1 style={{fontSize: "28px", fontWeight: "bold", textAlign: "center"}}>Your Favorite Recipes</h1>

          {posts.length === 0 ?(
            <div style={{textAlign: "center", paddingTop: "200px"}}>
              <h3>No favorite recipes saved yet!</h3>
            </div>
          ):(
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
                gap: "15px"
            }}>
                {posts.map((post)=>(
                    <PostCard key={post._id} post = {post}/>
                ))}
            </div>
          )}
        </div>
      </>
    )
}