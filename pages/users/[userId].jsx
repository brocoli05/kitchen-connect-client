// pages/users/[userId].jsx
import Link from "next/link";

export default function UserPage({ user, posts, notFound }) {
  if (notFound) {
    return (
      <div style={{ padding: 24 }}>
        <p>User not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "72px auto", padding: "0 16px" }}>
      <Link href="/">← Back</Link>

      {/* Profile header */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 12 }}>
        <img
          src={user.avatarUrl || "/default-avatar.png"}
          alt=""
          style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#eee" }}
        />
        <div>
          <h1 style={{ margin: "0 0 4px" }}>{user.name || user.username || "Unnamed user"}</h1>
          {user.bio && <p style={{ margin: 0, color: "#666" }}>{user.bio}</p>}
        </div>
      </div>

      {/* Posts list */}
      <h2 style={{ margin: "24px 0 12px" }}>Posts</h2>
      {posts?.length ? (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => (
            <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: "0 0 8px" }}>
                <Link href={`/posts/${p.id}`}>{p.title || "(no title)"}</Link>
              </h3>
              <p style={{ margin: 0, color: "#555" }}>
                {(p.excerpt ?? p.content ?? "").toString().slice(0, 140)}
                {(p.content?.length || 0) > 140 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p>No posts yet.</p>
      )}
    </div>
  );
}

// Call API server
export async function getServerSideProps({ params, req }) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `http://${req?.headers?.host || "localhost:3000"}`;

  try {
    // 1) User Information
    const uRes = await fetch(`${base}/api/users/${params.userId}`);
    if (!uRes.ok) return { props: { notFound: true } };
    const user = await uRes.json();

    // 2) The list of the user
    let posts = [];
    try {
      const pRes = await fetch(`${base}/api/users/${params.userId}/posts`);
      if (pRes.ok) {
        const data = await pRes.json();
        posts = data.items ?? [];
      }
    } catch {
      
      posts = [];
    }

    return { props: { user, posts } };
  } catch (e) {
    return { props: { notFound: true } };
  }
}
