import { useState, useEffect } from "react";
import axios from "axios";
import "../styles.css";

const api = axios.create({
  baseURL: "http://127.0.0.1:3000",
  headers: { "Content-Type": "application/json" }
});

function toId(value) {
  return value ? String(value) : "";
}

function getId(item, documentedKey) {
  return toId(item?.[documentedKey] || item?._id || item?.id);
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
  return {
    ...diceSet,
    diceSetId: getId(diceSet, "diceSetId"),
    dice: (diceSet.dice || []).map(toId)
  };
}

function normalizeGame(game) {
  if (!game) return null;
  return {
    ...game,
    gameId: getId(game, "gameId"),
    activePlayerId: toId(game.activePlayerId),
    activeDiceSetId: toId(game.activeDiceSetId),
    players: (game.players || []).map(normalizePlayer),
    dice: (game.dice || game.die || []).map(normalizeDie),
    diceSets: (game.diceSets || []).map(normalizeDiceSet)
  };
}

function authHeaders(token) {
  return token ? { Authorization: token } : {};
}

function PlayerPage({ token }) {
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [roll, setRoll] = useState(null);

  const search = new URLSearchParams(window.location.search);

  const params = {
    acctId: search.get("acctId"),
    gameId: search.get("gameId"),
    playerId: search.get("playerId")
  };

  async function loadPlayerPage() {
    try {
      const gameResponse = await api.get(
        `/accounts/${params.acctId}/games/${params.gameId}`
      );
      const rawGame = gameResponse.data.game;
      const normalizedGame = normalizeGame(rawGame);
      setGame(normalizedGame);

      const playersResponse = await api.get(
        `/accounts/${params.acctId}/games/${params.gameId}/players`
      );
      const allPlayers = playersResponse.data.players || [];
      const currentPlayer = allPlayers.find(
        (p) => toId(p._id) === toId(params.playerId)
      );
      setPlayer(currentPlayer || null);
    } catch (err) {
      console.error("Failed to load player page:", err);
    }
  }

  useEffect(() => {
    loadPlayerPage();
  }, [params.acctId, params.gameId, params.playerId]);

  async function rollDice() {
    try {
      setRoll(null);
      const response = await api.post(
        `/accounts/${params.acctId}/games/${params.gameId}/roll`,
        {
          from: params.playerId,
          playerId: params.playerId
        },
        { headers: authHeaders(token) } 
      );
      setRoll(response.data);
      await loadPlayerPage();
    } catch (err) {
      console.error("Roll failed:", err);
    }
  }

  const activeForPlayer =
    game && toId(game.activePlayerId) === toId(params.playerId);

  const activeDiceSet =
    game?.diceSets?.find(
      (set) => toId(set.diceSetId) === toId(game.activeDiceSetId)
    ) || null;

  return (
    <main className="app-shell player-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">{game?.game || "Game"}</p>
        <h1>{game?.name || "Loading game"}</h1>
        <h2>{player?.username || "Loading player"}</h2>

        <div className="roll-box">
          <p>
            {activeForPlayer
              ? "You are up."
              : "Waiting for the DM to arm your roll."}
          </p>
          <p className="muted">
            {activeDiceSet
              ? `${activeDiceSet.diceSetName}: ${activeDiceSet.scoring}`
              : "No dice set active."}
          </p>
          <button
            onClick={rollDice}
            disabled={!activeForPlayer || !activeDiceSet}
          >
            Roll
          </button>
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

export default PlayerPage;
