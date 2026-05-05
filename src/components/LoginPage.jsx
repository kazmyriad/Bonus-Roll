import {useState, useEffect, useMemo } from "react";
import axios from "axios";
import "../styles.css";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  headers: {
    "Content-Type": "application/json",
  },
});
// Sets base string for axios requests


// async function apiRequest(path, options = {}) {
//   const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
//   const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

//   if (response.status === 204) return null;

//   const data = await response.json().catch(() => ({}));
//   if (!response.ok) {
//     throw new Error(data.error || `Request failed with status ${response.status}`);
//   }
//   return data;
// }

// function Message({ message }) {
//   if (!message) return null;
//   return <p className={`message ${message.type}`}>{message.text}</p>;
// }

function getErrorMessage(error) {
  return error.response?.data?.error || error.message || "Request failed";
}

function LoginPage({ onLogin, onNavigate }) {
  const [loginInfo, setLoginInfo] = useState({ username: "", password: "" });
  const [message, setMessage] = useState(null);

  async function login(event) {
    event.preventDefault();
    // On slide 5, prevents browser from refreshing and effecting React states
    setMessage(null);
    try {
      const response = await api.post("/accounts/login", loginInfo);
      onLogin(response.data);
    } catch (error) {
      setMessage({ type: "error", text: getErrorMessage(error) });
    }
  }

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>Bonus Roll</h1>
        <h2>DM Login</h2>
        <form onSubmit={login} className="stack">
          <label>
            Username
            <input
              value={loginInfo.username}
              onChange={(event) => setLoginInfo({ ...loginInfo, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={loginInfo.password}
              onChange={(event) => setLoginInfo({ ...loginInfo, password: event.target.value })}
              required
            />
          </label>
          <button type="submit">Log In</button>
        </form>
        <button className="text-button" onClick={() => onNavigate("create")}>
          Create a DM account
        </button>
      </section>
    </main>
  );
}

export default LoginPage