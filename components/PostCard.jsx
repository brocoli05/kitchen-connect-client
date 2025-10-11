import Link from "next/link";
import { useRouter } from "next/router";

export default function PostCard({ post }) {
  const router = useRouter();

  const handleCardClick = (e) => {
    // Check if the clicked element is a link to prevent double navigation
    if (e.target.tagName === 'A' || e.target.closest('a')) {
      return;
    }
    // Navigate to post details using the post ID
    const postId = post.id || post._id?.$oid || post._id;
    router.push(`/posts/${postId}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      style={{
        border:'1px solid #ddd', 
        borderRadius:8, 
        padding:12, 
        marginBottom:12,
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
    >
      <h3 style={{margin:'0 0 8px 0'}}>{post.title}</h3>
      {post.photo && (
        <img 
          src={post.photo} 
          alt={post.title || "Post image"} 
          style={{
            width: '100%',
            maxHeight: '200px',
            objectFit: 'cover',
            borderRadius: '6px',
            marginBottom: '8px'
          }}
        />
      )}
      <p style={{margin:'0 0 8px 0', color:'#555'}}>{post.excerpt ?? post.content?.slice(0,100)}...</p>
      <div style={{display:'flex', gap:12, fontSize:14}}>
        <Link href={`/posts/${post.id || post._id?.$oid || post._id}`}>View</Link>
        {post.authorId && <Link href={`/users/${post.authorId}`}>Author</Link>}
      </div>
    </div>
  );
}
