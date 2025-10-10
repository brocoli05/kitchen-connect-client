// pages/posts/[postId].jsx
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import api from "../../utils/api";
import TopNavBar from "@/components/TopNavBar";

export default function PostPage({ post, notFound, postIdFromProps }) {
  const postId = post?.id;
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ title: post.title || '', content: post.content || '' });
  const [errors, setErrors] = useState({});
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    if (!token) return;

    fetch(`/api/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        setCurrentUser(data);
        if (data && post?.authorId && String(data.id) === String(post.authorId)) {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, [post]);

  if (notFound || !post) {
    return (
      <div style={{ padding: 24 }}>
        <p>Post not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this post? This action cannot be undone.");
    if (!ok) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
    try {
      const resp = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        alert("Post deleted");
        router.push("/");
      } else {
        const data = await resp.json();
        alert(data.message || "Failed to delete post");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete post. Please try again.");
    }
  };

  const startEdit = () => {
    setForm({ title: post.title || '', content: post.content || '' });
    setErrors({});
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setErrors({});
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: '' }));
  };

  const saveEdit = async () => {
    // Client-side validation
    const newErrors = {};
    if (!form.title || form.title.trim() === '') newErrors.title = 'Title is required';
    if (!form.content || form.content.trim() === '') newErrors.content = 'Content is required';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
    try {
      const resp = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, content: form.content }),
      });

      const data = await resp.json();
      if (resp.ok) {
        // Update UI
        post.title = data.title;
        post.content = data.content;
        setIsEditing(false);
        alert('Post updated');
      } else {
        alert(data.message || 'Failed to update post');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update post. Please try again.');
    }
  };

  useEffect(()=>{
    const checkFavorite = async () => {
      const token = localStorage.getItem("userToken");
      if(!token){
        return;
      }

      try{
        const res = await api.get(`posts/${postIdFromProps}/isFavorite`,{
          headers:{Authorization: `Bearer ${token}`}
        });
        setIsFavorited(res.data.isFavorited);
      }
      catch(error){
        console.error("Failed to get favorite post ", error);
      }
    };
    checkFavorite();
  },[postIdFromProps]);

  const handleSaveButton = async () => {
    const token = localStorage.getItem("userToken");
    if(!token){
      return;
    }
    
    try{
      const res = await api.post(`posts/${postIdFromProps}/favorite`,
        null,
        {headers: {Authorization: `Bearer ${token}`}}
      );
      setIsFavorited(res.data.isFavorited);
    }
    catch(error){
      console.log("Failed to handle save button ", error);
    }
  }

  return (
	<>
	 <TopNavBar/>
    <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
		
      <Link href="/">← Back</Link>

      <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

      {post.createdAt && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ color: "#666", marginTop: 0 }}>
          {new Date(post.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          })}
        </p>
        <button
            onClick={handleSaveButton}
            style={{
              padding: "8px 16px",
              fontSize: 16,
              border: "1px solid #333",
              borderRadius: 4,
              backgroundColor: isFavorited ? "#333" : "#fff",
              color: isFavorited ? "#fff" : "#333",
              cursor: "pointer",
              fontWeight: isFavorited ? "bold" : "normal",
            }}
          >
          {isFavorited ? "Saved" : "Save"}
          </button>
        </div>
      )}
      
      <article
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
          background: "#fafafa",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 16,
        }}
      >
        {post.content}
      </article>

      {/* Owner actions */}
      {isOwner && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          {!isEditing && (
            <>
              <button onClick={startEdit} style={{ background: '#2563eb', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>
                Edit Post
              </button>
              <button onClick={handleDelete} style={{ background: '#e53e3e', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>
                Delete Post
              </button>
            </>
          )}

          {isEditing && (
            <div style={{ marginTop: 12, width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="title" value={form.title} onChange={onChange} placeholder="Title" style={{ padding: 8, fontSize: 16 }} />
                {errors.title && <div style={{ color: 'red' }}>{errors.title}</div>}
                <textarea name="content" value={form.content} onChange={onChange} rows={8} placeholder="Content" style={{ padding: 8 }} />
                {errors.content && <div style={{ color: 'red' }}>{errors.content}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveEdit} style={{ background: '#10b981', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>Save</button>
                  <button onClick={cancelEdit} style={{ background: '#6b7280', color: '#fff', padding: '8px 12px', border: 'none', borderRadius: 6 }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- COMMENT section --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />

      <section className="comments-section">
        <h2 style={{ marginBottom: 20 }}>Comments</h2>
        {postId && <CommentSection recipeId={postId} />}
      </section>
    </div>
	</>
  );
}

export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;
  try {
    const r = await fetch(`${base}/api/posts/${params.postId}`);
    if (!r.ok) return { props: { notFound: true } };
    const post = await r.json();
    return { props: { post, postIdFromProps: params.postId} };
  } catch {
    return { props: { notFound: true } };
  }
}