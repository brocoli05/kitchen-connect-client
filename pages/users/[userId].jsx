// pages/users/[userId].jsx
import TopNavBar from "@/components/TopNavBar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";

export default function UserPage({ user, posts, notFound }) {
	const [following, setFollowing] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [currentUserId, setCurrentUserId] = useState(null);
	const handleFollowToggle = () => {
	  const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
	  if (!token) return;
	  setIsLoading(true);
	  const action = following ? 'unfollow' : 'follow';
	  fetch(`/api/users/${user.id}/${action}`, {
		method: 'POST',
		headers: { 'Authorization': `Bearer ${token}` }
	  })
	  .then((r) => {
		if (r.ok) {
		console.log('Updating following state from', following, 'to', !following);
		  setFollowing(!following);
		} else {
		  alert('Failed to update follow status');
		}
	  })
	  .catch(() => {
		alert('Failed to update follow status');
	  })
	  .finally(() => {
		setIsLoading(false);
	  });
	}
	useEffect(() => {
		// Check if the current user is following this profile
		const token = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;
		if (!token) {
			console.log('No token found');
			return;
		}

		console.log('Fetching current user data...');
		fetch(`/api/me`, { headers: { Authorization: `Bearer ${token}` } })
			.then((r) => r.ok ? r.json() : null)
			.then((data) => {
				console.log('API /me response:', data);
				if (data) {
					setCurrentUserId(data.id); // Store current user's ID
					console.log('Current user ID:', data.id, 'Profile user ID:', user.id);
					
					if (data.following && Array.isArray(data.following)) {
						const isFollowing = data.following.includes(user.id);
						console.log('Following array:', data.following);
						console.log('Is following this user?', isFollowing);
						setFollowing(isFollowing);
					} else {
						console.log('No following array found or not an array');
					}
				}
			})
			.catch((error) => {
				console.error('Error fetching user data:', error);
			});
	}, [user]);
  if (notFound) {
    return (
      <div style={{ padding: 24 }}>
        <p>User not found.</p>
        <Link href="/">← Back</Link>
      </div>
    );
  }

  return (
	<>
	<TopNavBar />
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
	{currentUserId && currentUserId !== user.id && (
	  <Button onClick={handleFollowToggle} disabled={isLoading}>
		{following ? "Unfollow" : "Follow"}
	  </Button>
	)}
    </div>
	</>

  );
}


export async function getServerSideProps({ params, req }) {
  const base = `http://${req?.headers?.host || "localhost:3000"}`;

  try {
    // User Information
    const uRes = await fetch(`${base}/api/users/${params.userId}`);
    if (!uRes.ok) return { props: { notFound: true } };
    const user = await uRes.json();

    
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
  } catch {
    return { props: { notFound: true } };
  }
}
