// ChatSidebar.jsx
import React, { useState } from "react";
import "./ChatSidebar.css";

export default function ChatSidebar({ userPos, viewMode }) {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi — ask me about nearby attractions or fitness routes!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          userLat: userPos?.lat,
          userLon: userPos?.lon,
          viewMode,
        }),
      });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const json = await res.json();
      const botText = json.reply || "Sorry, no reply.";
      setMessages((m) => [...m, { role: "bot", text: botText }]);
      // optional: you can also display json.retrieved list
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Error connecting to server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-sidebar">
      <div className="chat-history">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="msg-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about recommendations..."
        />
        <button onClick={send} disabled={loading}>
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
