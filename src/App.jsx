import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import LoginPage from "./components/LoginPage.jsx";
import CreateAccountPage from "./components/CreateAccountPage.jsx";
import ManageGamesPage from "./components/ManageGamesPage.jsx";
import PlayerPage from "./components/PlayerPage.jsx";

const API_BASE = "http://127.0.0.1:3000";

function toId(value) {
  if (!value) return "";
  return String(value);
}

function getId(item, documentedKey) {
  return toId(item?.[documentedKey] || item?._id || item?.id);
}

function normalizeGame(game) {
  if (!game) return null;
  return {
    ...game,
    gameId: getId(game, "gameId"),
    activePlayerId: toId(game.activePlayerId),
    activeDiceSetId: toId(game.activeDiceSetId),
    name: game.name || "Untitled game",
    game: game.game || "Unknown system",
    players: (game.players || []).map(normalizePlayer),
    dice: (game.dice || game.die || []).map(normalizeDie),
    diceSets: (game.diceSets || []).map(normalizeDiceSet),
  };
}

function normalizePlayer(player) {
  if (!player) return null;
  return { ...player, playerId: getId(player, "playerId") };
}

function normalizeDie(die) {
  if (!die) return null;
  return { ...die, dieId: getId(die, "dieId") };
}

function normalizeDiceSet(diceSet) {
  if (!diceSet) return null;
  return { ...diceSet, diceSetId: getId(diceSet, "diceSetId"), dice: (diceSet.dice || []).map(toId) };
}

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

function authHeaders(token) {
  return token ? { Authorization: token } : {};
}

function playerLink(acctId, gameId, playerId) {
  const url = new URL(window.location.href);
  url.search = new URLSearchParams({
    page: "player",
    acctId,
    gameId,
    playerId,
  }).toString();
  return url.toString();
}

function parseListInput(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const numeric = Number(item);
      return Number.isNaN(numeric) ? item : numeric;
    });
}

function Message({ message }) {
  if (!message) return null;
  return <p className={`message ${message.type}`}>{message.text}</p>;
}

function App() {
  const search = new URLSearchParams(window.location.search);
  const playerParams = {
    page: search.get("page"),
    acctId: search.get("acctId"),
    gameId: search.get("gameId"),
    playerId: search.get("playerId"),
  };
  const isPlayerPage = playerParams.page === "player" && playerParams.acctId && playerParams.gameId && playerParams.playerId;
  const [page, setPage] = useState(localStorage.getItem("token") ? "manage" : "login");
  const [session, setSession] = useState({
    acctId: localStorage.getItem("acctId") || "",
    token: localStorage.getItem("token") || "",
  });

  function saveSession(data) {
    localStorage.setItem("acctId", data.acctId);
    localStorage.setItem("token", data.token);
    setSession({ acctId: data.acctId, token: data.token });
    setPage("manage");
  }

  function logout() {
    localStorage.removeItem("acctId");
    localStorage.removeItem("token");
    setSession({ acctId: "", token: "" });
    setPage("login");
  }

  if (isPlayerPage) return <PlayerPage params={playerParams} />;
  if (page === "create") return <CreateAccountPage onCreate={saveSession} onNavigate={setPage} />;
  if (page === "manage" && session.token) return <ManageGamesPage session={session} onLogout={logout} />;
  return <LoginPage onLogin={saveSession} onNavigate={setPage} />;
}

export default App;
