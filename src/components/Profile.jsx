import { useState } from "react";
import "../styles.css";

const API_BASE = "http://localhost:3000";

function Profile() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [acct, setAcct] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [acctId, setAcctId] = useState(localStorage.getItem("acctId") || "");
  const [error, setError] = useState("");

  async function request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      ...options,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function submitAuth() {
    try {
      setError("");

      const data = await request(mode === "login" ? "/accounts/login" : "/accounts", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        setToken(data.token);
      }

      localStorage.setItem("acctId", data.acctId);
      setAcctId(data.acctId);

      setAcct(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadProfile() {
    try {
      setError("");
      const data = await request(`/accounts/${acctId}`);
      setAcct(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="appPage">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
          <p className="muted">Sign in, create an account, and manage your saved games.</p>
        </div>
      </section>

      <section className="panelGrid">
        <div className="panel">
          <div className="segmented">
            <button className={mode === "login" ? "selected" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button className={mode === "register" ? "selected" : ""} onClick={() => setMode("register")}>
              Register
            </button>
          </div>

          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>

          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>

          <button className="primaryButton" onClick={submitAuth}>
            {mode === "login" ? "Login" : "Create Account"}
          </button>

          {error && <p className="errorText">{error}</p>}
        </div>

        <div className="panel">
          <h2>Current Account</h2>

          <label>
            Account ID
            <input value={acctId} onChange={(e) => setAcctId(e.target.value)} />
          </label>

          <button className="secondaryButton" onClick={loadProfile}>
            Load Profile
          </button>

          {acct && (
            <div className="summaryList">
              <p><strong>Username:</strong> {acct.username || username}</p>
              <p><strong>Games:</strong> {acct.games?.length || 0}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Profile;
