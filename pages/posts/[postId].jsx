// pages/posts/[postId].jsx
import Link from "next/link";
import { useRouter } from "next/router";
import CommentSection from "@/components/CommentSection";
import { useEffect, useState } from "react";

export default function PostPage({ post, notFound }) {
  const postId = post?.id;
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // initialize empty and populate when `post` is available to avoid SSR undefined access
  const [form, setForm] = useState({ title: '', content: '', photo: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (post) {
      setForm({ title: post.title || '', content: post.content || '', photo: post.photo || '' });
    }
  }, [post]);

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
    setForm({ title: post.title || '', content: post.content || '', photo: post.photo || '' });
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
      let resp;
      if (photoFile) {
        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('content', form.content);
        formData.append('photo', photoFile);
        resp = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      } else {
        resp = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: form.title, content: form.content, photo: form.photo }),
        });
      }

      const data = await resp.json();
      if (resp.ok) {
        // Update UI
        post.title = data.title;
        post.content = data.content;
        post.photo = data.photo;
        setIsEditing(false);
        setPhotoFile(null);
        setForm((f)=> ({...f, photo: data.photo || ''}));
        alert('Post updated');
      } else {
        alert(data.message || 'Failed to update post');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update post. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
      <Link href="/">← Back</Link>

      <h1 style={{ margin: "16px 0 8px" }}>{post.title}</h1>

      {post.createdAt && (
        <p style={{ color: "#666", marginTop: 0 }}>
          {new Date(post.createdAt).toLocaleString()}
        </p>
      )}

      {post.photo && (
        <img
          src={post.photo}
          alt=""
          style={{ maxWidth: "100%", borderRadius: 8, margin: "12px 0" }}
        />
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
                <input name="photo" value={form.photo} onChange={onChange} placeholder="Photo URL (optional)" style={{ padding: 8 }} />
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280' }}>Or upload a new photo</label>
                  <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0] || null)} />
                </div>
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
  );
}

export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;
  try {
    const r = await fetch(`${base}/api/posts/${params.postId}`);
    if (!r.ok) return { props: { notFound: true } };
    const post = await r.json();
    return { props: { post } };
  } catch {
    return { props: { notFound: true } };
  }
}
