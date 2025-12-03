import TooltipButton from "./TooltipButton";

export default function PostActions({ isOwner, onLike, onRepost, onDelete }) {
  // Read Only: if not owner, hide these options edit / delete 
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      <TooltipButton tooltip="Like" delay={200}>
        <button type="button" onClick={onLike}>Like</button>
      </TooltipButton>

      <TooltipButton tooltip="Repost" delay={200}>
        <button type="button" onClick={onRepost}>Repost</button>
      </TooltipButton>

      {isOwner && (
        <>
          <TooltipButton tooltip="Edit" delay={200}>
            <button type="button" disabled>Edit</button>
          </TooltipButton>

          <TooltipButton tooltip="Delete" delay={200}>
            <button type="button" onClick={onDelete} style={{ background: "#e53e3e", color: "#fff" }}>
              Delete
            </button>
          </TooltipButton>
        </>
      )}
    </div>
  );
}