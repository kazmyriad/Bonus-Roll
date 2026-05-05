import {useState, useEffect, useMemo } from "react";
import "../styles.css";

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

function PlayerPage({ params }) {
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [message, setMessage] = useState(null);
  const [roll, setRoll] = useState(null);
  const [rollInstructions, setRollInstructions] = useState(null);

  async function loadPlayerPage() {
    const [gameData, playerData] = await Promise.all([
      apiRequest(`/accounts/${params.acctId}/games/${params.gameId}`),
      apiRequest(`/accounts/${params.acctId}/games/${params.gameId}/players/${params.playerId}`),
    ]);
    setGame(normalizeGame(gameData.game || gameData));
    setPlayer(normalizePlayer(playerData.player || playerData));
  }

  useEffect(() => {
    loadPlayerPage().catch((error) => setMessage({ type: "error", text: error.message }));
  }, [params.acctId, params.gameId, params.playerId]);

  async function rollDice() {
    setMessage(null);
    setRoll(null);
    let outcomes = [];
    try {
      const data = await apiRequest(`/accounts/${params.acctId}/games/${params.gameId}/Roll`, {
        method: "POST",
        headers: authHeaders(localStorage.getItem("token") || ""),
        body: JSON.stringify({ from: params.playerId, playerId: params.playerId }),
      });
      console.log("Roll response data:", data.outcomes);
      setRoll(data);
      await loadPlayerPage();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  const activeForPlayer = game?.activePlayerId === params.playerId;
  const activeDiceSet = game?.diceSets.map(normalizeDiceSet).find((set) => set.diceSetId === game.activeDiceSetId);

  return (
    <main className="app-shell player-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">{game?.game || "Game"}</p>
        <h1>{game?.name || "Loading game"}</h1>
        <h2>{player?.username || "Loading player"}</h2>
        <Message message={message} />
        <div className="roll-box">
          <p>{activeForPlayer ? "You are up." : "Waiting for the DM to arm your roll."}</p>
          <p className="muted">{activeDiceSet ? activeDiceSet.diceSetName + ": " + activeDiceSet.scoring : "No dice set active."}</p>
          <button onClick={rollDice} disabled={!activeForPlayer || !activeDiceSet}>Roll</button>
        </div>
        {roll && (
          <div className="result">
            <span>Result</span>
            <strong>{roll.outcomes}</strong>
          </div>
        )}
      </section>
    </main>
  );
}

export default PlayerPage