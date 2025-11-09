import Link from "next/link";

function normalizeId(v) {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (v.$oid) return v.$oid;
    if (v.toString) return v.toString();
  }
  return String(v);
}

export default function ActivityItem({ item }) {
  const pid = normalizeId(item.postId);
  const time = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";

  return (
    <div style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee", alignItems: "flex-start" }}>
      <div style={{ width: 44, display: "flex", justifyContent: "center" }}>
        {item.type === "view" && (
          <span title="Viewed" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
        {item.type === "comment" && (
          <span title="Commented" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
        {item.type === "favorite" && (
          <span title="Saved" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
        {item.type === "unsaved" && (
          <span title="Unsaved" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
        {item.type === "comment_edited" && (
          <span title="Edited" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
        {item.type === "comment_deleted" && (
          <span title="Deleted" style={{ fontSize: 20, lineHeight: 1 }}></span>
        )}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>
              {pid ? (
                <Link href={`/posts/${encodeURIComponent(pid)}`}>{item.title || `Post ${pid}`}</Link>
              ) : (
                <span>{item.title || "(no title)"}</span>
              )}
            </div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>
              {item.type === "view" && "Viewed"}
              {item.type === "comment" && "Commented"}
              {item.type === "favorite" && "Saved"}
              {item.type === "unsaved" && "Unsaved"}
              {item.type === "comment_edited" && "Comment edited"}
              {item.type === "comment_deleted" && "Comment deleted"}
            </div>
          </div>

          <div style={{ color: "#9ca3af", fontSize: 12 }}>{time}</div>
        </div>

        {item.type === "comment" && item.text && (
          <div style={{ marginTop: 8, color: "#000000ff" }}>{item.text}</div>
        )}
      </div>
    </div>
  );
}
