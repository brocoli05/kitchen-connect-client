// pages/posts/create.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import TopNavBar from "@/components/TopNavBar";

/** Helper: check auth on client */
const isSignedIn = () =>
  typeof window !== "undefined" && !!localStorage.getItem("userToken");

export default function CreatePostPage() {
  const router = useRouter();

  // Form fields
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [timeMax, setTimeMax] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [dietary, setDietary] = useState("");
  const [include, setInclude] = useState("");
  const [exclude, setExclude] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Redirect to /login if not signed in
  useEffect(() => {
    if (!isSignedIn()) {
      router.replace("/login");
    }
  }, [router]);

  // Validate and set image file
  const onPhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setPhotoFile(null);
    if (!f.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }
    setPhotoFile(f);
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic required fields
    if (!title.trim() || !content.trim()) {
      alert("Title and Content are required.");
      return;
    }

    const token = localStorage.getItem("userToken");
    if (!token) {
      alert("Login required.");
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      let resp;

      if (photoFile) {
        // Use multipart/form-data when an image is attached
        const fd = new FormData();
        fd.append("title", title);
        fd.append("content", content);
        if (timeMax) fd.append("timeMax", String(timeMax));
        if (difficulty) fd.append("difficulty", difficulty);
        if (dietary) fd.append("dietary", dietary);
        if (include) fd.append("include", include);
        if (exclude) fd.append("exclude", exclude);
        fd.append("photo", photoFile);

        resp = await fetch("/api/posts/create", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }, // do not set Content-Type manually
          body: fd,
        });
      } else {
        // JSON request when there is no image file
        const body = {
          title,
          content,
          timeMax: timeMax ? Number(timeMax) : undefined,
          difficulty: difficulty || undefined,
          dietary: dietary || undefined,
          include: include || undefined,
          exclude: exclude || undefined,
        };

        resp = await fetch("/api/posts/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.message || "Failed to create post");
      }

      // Redirect to detail page using returned id
      const id = data?.id;
      if (id) {
        router.push(`/posts/${id}`);
      } else {
        // Fallback: go to recipes list
        router.push("/recipes");
      }
    } catch (err) {
      console.error("Create post failed:", err);
      alert(err.message || "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Post | Kitchen Connect</title>
      </Head>

      <TopNavBar />

      <div style={{ maxWidth: 820, margin: "72px auto", padding: "0 16px" }}>
        <h1 style={{ marginBottom: 16 }}>Create a New Recipe</h1>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
          {/* Required fields */}
          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: 10, fontSize: 16 }}
          />
          <textarea
            rows={6}
            placeholder="Write your recipe..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            style={{ padding: 10 }}
          />

          {/* Optional, filterable fields */}
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <input
              type="number"
              min={0}
              placeholder="Max time (min)"
              value={timeMax}
              onChange={(e) => setTimeMax(e.target.value)}
              style={{ padding: 10 }}
            />

            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={{ padding: 10 }}
            >
              <option value="">Any difficulty</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            <input
              placeholder="Dietary (e.g. vegan, halal)"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              style={{ padding: 10 }}
            />

            <input
              placeholder="Include ingredients (comma)"
              value={include}
              onChange={(e) => setInclude(e.target.value)}
              style={{ padding: 10 }}
            />

            <input
              placeholder="Exclude ingredients (comma)"
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              style={{ padding: 10 }}
            />
          </div>

          {/* Optional image */}
          <div>
            <label style={{ display: "block", fontSize: 14, color: "#555" }}>
              Add Photo (optional)
            </label>
            <input type="file" accept="image/*" onChange={onPhotoChange} />
          </div>

          {/* Submit / Cancel */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "10px 14px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {submitting ? "Submitting..." : "Create"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/recipes")}
              style={{
                padding: "10px 14px",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}