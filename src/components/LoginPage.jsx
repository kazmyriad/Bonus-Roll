import {useState, useEffect, useMemo } from "react";
import "../styles.css";

const API_BASE = "http://127.0.0.1:3000";

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

function Message({ message }) {
  if (!message) return null;
  return <p className={`message ${message.type}`}>{message.text}</p>;
}

function LoginPage({ onLogin, onNavigate }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await apiRequest("/accounts/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>Bonus Roll</h1>
        <h2>DM Login</h2>
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          <button type="submit">Log In</button>
        </form>
        <Message message={message} />
        <button className="text-button" onClick={() => onNavigate("create")}>
          Create a DM account
        </button>
      </section>
    </main>
  );
}

export default LoginPage