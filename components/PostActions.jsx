export default function PostActions({ isOwner, onLike, onRepost, onDelete }) {
    // Read Only: if not owner, hide these options edit / delete 
    return (
      <div style={{display:'flex', gap:8, marginTop:16}}>
        <button type="button" onClick={onLike}>Like</button>
        <button type="button" onClick={onRepost}>Repost</button>
        {isOwner && (
          <>
            <button type="button" disabled>Edit</button>
            <button type="button" onClick={onDelete} style={{background:'#e53e3e', color:'#fff'}}>
              Delete
            </button>
          </>
        )}
      </div>
    );
  }