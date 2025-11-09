import { useEffect, useState } from "react";

export default function RecipeTitleInput({ value = "", onSelect = () => {}, placeholder = "Enter recipe title..." }) {
  const [title, setTitle] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTitle(value || "");
  }, [value]);

  useEffect(() => {
    if (!title || title.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipe-autocomplete?query=${encodeURIComponent(title)}&number=6`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(true);
      } catch (err) {
        console.error("autocomplete fetch error", err);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [title]);

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onSelect(e.target.value);
        }}
        placeholder={placeholder}
        className="border p-2 w-full rounded"
      />

      {open && suggestions.length > 0 && (
        <ul style={{ position: "absolute", zIndex: 40, background: "#fff", border: "1px solid #ddd", width: "100%", marginTop: 4, borderRadius: 6, listStyle: "none", padding: 0 }}>
          {suggestions.map((item) => (
            <li
              key={item.id}
              style={{ padding: "8px 12px", cursor: "pointer" }}
              onClick={() => {
                setTitle(item.title);
                setSuggestions([]);
                setOpen(false);
                // pass the whole item (id + title) so caller can fetch details
                onSelect({ id: item.id, title: item.title });
              }}
            >
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
