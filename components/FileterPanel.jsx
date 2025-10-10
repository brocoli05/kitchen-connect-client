// components/FilterPanel.jsx
import { useState, useEffect } from "react";

export default function FilterPanel({ value, onChange, onClear }) {
  const [local, setLocal] = useState({
    q: "",
    timeMax: "",
    difficulty: "",
    dietary: "",   
    include: "",
    exclude: "",
    sort: "relevance",
    ...value,
  });

  useEffect(() => setLocal(prev => ({ ...prev, ...value })), [value]);

  const update = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className="filter-panel" style={{display:"grid", gap:8}}>
      <input placeholder="Search keyword…" value={local.q} onChange={e=>update({ q:e.target.value })}/>
      <input placeholder="Max cook time (min)" value={local.timeMax} onChange={e=>update({ timeMax:e.target.value })}/>
      <select value={local.difficulty} onChange={e=>update({ difficulty:e.target.value })}>
        <option value="">Any difficulty</option>
        <option>Easy</option>
        <option>Medium</option>
        <option>Hard</option>
      </select>
      <input placeholder="Dietary (comma, e.g. vegan,halal)" value={local.dietary} onChange={e=>update({ dietary:e.target.value })}/>
      <input placeholder="Include ingredients (comma)" value={local.include} onChange={e=>update({ include:e.target.value })}/>
      <input placeholder="Exclude ingredients (comma)" value={local.exclude} onChange={e=>update({ exclude:e.target.value })}/>
      <select value={local.sort} onChange={e=>update({ sort:e.target.value })}>
        <option value="relevance">Sort: Relevance</option>
        <option value="newest">Sort: Newest</option>
        <option value="liked">Sort: Most liked</option>
      </select>
      <button type="button" onClick={onClear}>Clear All</button>
    </div>
  );
}
