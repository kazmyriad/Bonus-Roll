import {useState} from "react";
import axios from "axios";
import "../styles.css";

// const API_BASE = "http://127.0.0.1:3000";
const api = axios.create({
    baseURL:"http://127.0.0.1:3000",
    headers:{
        "Content-Type": "application/json",
    }
});
// Sets base string for axios requests

function CreateAccountPage({ onCreate, onNavigate }) {
  const [loginInfo, setLoginInfo] = useState({ username: "", password: "" });
  const [message, setMessage] = useState(null);

  async function createAccount(event) {
    event.preventDefault();
    // On slide 5, prevents browser from refreshing and effecting React states

    setMessage(null);
    try {
        await api.post("/accounts", loginInfo);
        const login = await api.post("/accounts/login", loginInfo);
        onCreate(login.data);
    } catch (error) {
        setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>Bonus Roll</h1>
        <h2>Create DM Account</h2>
        <form onSubmit={createAccount} className="stack">
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
          <button type="submit">Create Account</button>
        </form>
        <button className="text-button" onClick={() => onNavigate("login")}>
          Back to login
        </button>
      </section>
    </main>
  );
}

export default CreateAccountPage;