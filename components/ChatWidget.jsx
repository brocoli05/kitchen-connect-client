import { useEffect, useRef, useState } from "react";
import styles from "@/styles/chatWidget.module.css";

export default function ChatWidget({ contextId = null }) {
  const [disabled, setDisabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {from:'user'|'bot', text}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgRef = useRef(null);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    try {
      setDisabled(localStorage.getItem("aiDisabled") === "true");
    } catch {}
  }, []);

  useEffect(() => {
    if (open && msgRef.current) {
      msgRef.current.scrollTop = msgRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleReEnable = () => {
    const ok = window.confirm("Re-enable AI chat features?");
    if (!ok) return;
    try {
      localStorage.removeItem("aiDisabled");
      setDisabled(false);
      alert("AI features re-enabled.");
    } catch {
      alert("Failed to re-enable AI features.");
    }
  };

  const send = async (text) => {
    if (!text || loading || disabled) return;
    const userMsg = { from: "user", text };
    setMessages((s) => [...s, userMsg]);
    setShowHint(false);
    setLoading(true);
    setInput("");

    try {
      const params = new URLSearchParams();
      params.set("text", text);
      if (contextId) params.set("contextId", String(contextId));

      const res = await fetch(`/api/spoonacular/converse?${params.toString()}`);
      const data = await res.json();
      const reply = data?.answerText || data?.message || "(no answer)";
      if (reply === "(no answer)") {
        setShowHint(true);
        setMessages((s) => [
          ...s,
          {
            from: "bot",
            text:
              "Sorry, unfortunately we don't have the answer for that. Try asking something like 'food trivia', 'which wine goes well with spaghetti carbonara', or '2 cups of butter in grams'.",
          },
        ]);
      } else {
        setMessages((s) => [...s, { from: "bot", text: reply }]);
      }
    } catch (err) {
      console.error("chat send error", err);
      setMessages((s) => [...s, { from: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    send(t);
  };

  return (
    <div>
      <button
        className={styles.fab}
        aria-label={disabled ? "AI disabled" : (open ? "Close chat" : "Open chat")}
        onClick={() => setOpen((v) => !v)}
        style={disabled ? { background: '#888', cursor: 'pointer' } : undefined}
        title={disabled ? "AI features disabled" : "Chat with recipe bot"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && !disabled && (
        <div className={styles.panel} role="dialog" aria-label="Chat with Spoonacular">
          <div className={styles.header}>
            <strong>Recipe Chat</strong>
            <button className={styles.close} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className={styles.messages} ref={msgRef}>
            {(showHint || messages.length === 0) && (
              <div className={styles.hint}>
                <strong>Try asking:</strong>
                <ul>
                  <li>Ask for nutrient contents like "vitamin a in 2 carrots" or "calories in 1 cup of butter"</li>
                  <li>Convert something with "2 cups of butter in grams"</li>
                  <li>Find food substitutes by saying "what is a substitute for flour"</li>
                  <li>Thirsty? Ask for wine pairings like "which wine goes well with spaghetti carbonara"</li>
                  <li>If you want more results, just say "more"</li>
                  <li>For more similar results say "more like the first/second/third..."</li>
                  <li>Want food trivia? Say "food trivia"</li>
                </ul>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8 }}>
                  <button
                    className={styles.quick}
                    onClick={() => {
                      // Prefill input so user can add their own ingredient
                      setInput("what is a substitute for ");
                    }}
                  >
                    Substitute
                  </button>
                  <button className={styles.quick} onClick={() => send("food trivia")}>Food Trivia</button>
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.from === "user" ? styles.msgUser : styles.msgBot}>
                {m.text}
              </div>
            ))}
            {loading && <div className={styles.msgBot}>...</div>}
          </div>
          <form className={styles.inputRow} onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the recipe bot..."
              className={styles.input}
              disabled={loading}
            />
            <button type="submit" className={styles.send} disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
      {open && disabled && (
        <div className={styles.panel} role="dialog" aria-label="AI disabled notice" style={{display:'flex',flexDirection:'column'}}>
          <div className={styles.header}>
            <strong>AI Disabled</strong>
            <button className={styles.close} onClick={() => setOpen(false)}>✕</button>
          </div>
          <div style={{padding:'12px',fontSize:14,lineHeight:1.4}}>
            Chat features are disabled by your profile setting. Re-enable AI to use the recipe assistant.
          </div>
          <div style={{display:'flex',gap:8,padding:'0 12px 12px'}}>
            <button onClick={handleReEnable} style={{background:'#10b981',color:'#fff',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer'}}>
              Enable AI Now
            </button>
            <button onClick={()=>{setOpen(false);}} style={{background:'#6b7280',color:'#fff',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer'}}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
