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
  const [form, setForm] = useState({ title: post.title || '', content: post.content || '', photo: post.photo || '' });
  const [errors, setErrors] = useState({});

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
      // If a file was selected, upload it first
      let photoUrl = form.photo;
      if (form.photoFile && form.photoFile.length > 0) {
        const fd = new FormData();
        fd.append('photo', form.photoFile[0]);
        const uploadResp = await fetch('/api/uploads', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : undefined, body: fd });
        if (!uploadResp.ok) {
          // try to read JSON error body, otherwise text
          let errMsg = 'Upload failed';
          try {
            const errJson = await uploadResp.json();
            errMsg = errJson.message || JSON.stringify(errJson);
          } catch (e) {
            try { errMsg = await uploadResp.text(); } catch (_) {}
          }
          console.error('Upload failed', uploadResp.status, errMsg);
          throw new Error(errMsg || 'Upload failed');
        }
        const uploadData = await uploadResp.json();
        photoUrl = uploadData.url;
      }

      const resp = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: form.title, content: form.content, photo: photoUrl }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch (e) {
        console.error('Failed to parse response JSON', e);
      }
      if (resp.ok) {
        // Update UI
        post.title = data.title;
        post.content = data.content;
        post.photo = data.photo;
        setIsEditing(false);
        alert('Post updated');
      } else {
        const msg = (data && data.message) || `Update failed (${resp.status})`;
        console.error('Update failed', resp.status, data);
        alert(msg);
      }
    } catch (e) {
      console.error('Save edit error:', e);
      alert(e.message || 'Failed to update post. Please try again.');
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
                  <label htmlFor="photoFile">Or upload image:</label>
                  <input id="photoFile" type="file" accept="image/*" onChange={(e) => setForm(f => ({ ...f, photoFile: e.target.files }))} />
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
