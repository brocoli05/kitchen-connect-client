import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import PostCard from "@/components/PostCard";
import api from "@/utils/api";
import Link from "next/link";

export default function FavoritePosts(){
  const [posts,setPosts] = useState([]);
  const [q, setQ] = useState("");
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
        <div style={{padding: "20px", paddingLeft: "40px"}}>
          <Link href="/">← Back</Link>
        </div>
        <br/> <br/>
        <div style={{paddingLeft: "40px", paddingRight: "40px", paddingBottom: "40px"}}>
          <h1 style={{fontSize: "28px", fontWeight: "bold"}}>Your Favorite Recipes</h1>

          {/* Search bar for filtering favorites by title (case-insensitive) */}
          <div style={{display: "flex", justifyContent: "center", margin: "18px 0"}}>
            <input
              type="text"
              placeholder="Search saved recipes by title..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search saved recipes"
              autoComplete="off"
              style={{
                padding: "10px 14px",
                width: "100%",
                maxWidth: 2000,
                borderRadius: 8,
                border: "1px solid #ddd",
                backgroundColor: "rgba(255,255,255,0.95)",
                color: "#111827",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                fontSize: 16,
              }}
            />
          </div>

          {posts.length === 0 ? (
            <div style={{textAlign: "center", paddingTop: "200px"}}>
              <h3>No favorite recipes saved yet!</h3>
            </div>
          ) : (
            (() => {
              const query = (q || "").trim().toLowerCase();
              const filtered = query === "" ? posts : posts.filter((p) => {
                const title = (p.title || "").toString().toLowerCase();
                return title.includes(query);
              });

              if (filtered.length === 0) {
                return (
                  <div style={{textAlign: "center", paddingTop: "60px"}}>
                    <h3>No recipes found for &quot;{q}&quot;</h3>
                  </div>
                );
              }

              return (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(600px, 1fr))",
                    gap: "15px"
                }}>
                    {filtered.map((post)=>(
                        <PostCard key={post._id} post = {post}/>
                    ))}
                </div>
              );
            })()
          )}
        </div>
      </>
    )
}