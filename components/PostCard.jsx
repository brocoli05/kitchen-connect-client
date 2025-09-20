import Link from "next/link";

export default function PostCard({ post }) {
  return (
    <div style={{border:'1px solid #ddd', borderRadius:8, padding:12, marginBottom:12}}>
      <h3 style={{margin:'0 0 8px 0'}}>{post.title}</h3>
      <p style={{margin:'0 0 8px 0', color:'#555'}}>{post.excerpt ?? post.content?.slice(0,100)}...</p>
      <div style={{display:'flex', gap:12, fontSize:14}}>
        <Link href={`/posts/${post.id}`}>View</Link>
        <Link href={`/users/${post.authorId}`}>Author</Link>
      </div>
    </div>
  );
}
