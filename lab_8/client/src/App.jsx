import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = "/query";

export default function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setError(null);
    setLoading(true);
    const entry = { question: q, answer: null, sql: null, rows: null, rowCount: null, err: null };
    setHistory((prev) => [...prev, entry]);

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        entry.err = data.error || res.statusText;
      } else {
        entry.answer = data.answer;
        entry.sql = data.sql;
        entry.rows = data.rows;
        entry.rowCount = data.rowCount;
        entry.error = data.error;
      }
    } catch (err) {
      entry.err = err.message || "Request failed";
    } finally {
      setLoading(false);
      setHistory((prev) => [...prev.slice(0, -1), { ...entry }]);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Lab 9.2 — Multi-Agent (Router with Tools)</h1>
        <p className="subtitle">Router chooses HTML RAG or SQL agent via tool calls. Ask about docs or data.</p>
      </header>

      <main className="main">
        <div className="chat">
          {history.length === 0 && (
            <div className="welcome">
              <p>Try questions like:</p>
              <ul>
                <li>How many users are there?</li>
                <li>List all permissions</li>
                <li>Which users have the admin_users permission?</li>
                <li>What is SSO?</li>
                <li>How does login work?</li>
              </ul>
            </div>
          )}
          {history.map((h, i) => (
            <div key={i} className="turn">
              <div className="user-q">{h.question}</div>
              {h.err && <div className="msg error">Error: {h.err}</div>}
              {h.answer != null && (
                <>
                  <div className="msg answer">{h.answer}</div>
                  {h.sql && (
                    <details className="details">
                      <summary>SQL</summary>
                      <pre className="sql">{h.sql}</pre>
                    </details>
                  )}
                  {h.rows != null && h.rows.length > 0 && (
                    <details className="details">
                      <summary>Results ({h.rowCount} row{h.rowCount !== 1 ? "s" : ""})</summary>
                      <pre className="results">{JSON.stringify(h.rows.slice(0, 20), null, 2)}</pre>
                    </details>
                  )}
                </>
              )}
              {loading && history[history.length - 1] === h && (
                <div className="msg loading">Thinking…</div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about users, permissions, docs…"
            disabled={loading}
            autoFocus
          />
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? "…" : "Ask"}
          </button>
        </form>
      </main>
    </div>
  );
}
