import {useState, useEffect, useMemo } from "react";
import axios from "axios";
import "../styles.css";

const api = axios.create({
    baseURL:"http://127.0.0.1:3000",
    headers:{
        "Content-Type": "application/json",
    }
});
// Sets base string for axios requests

function toId(value) {
  if (!value) return "";
  return String(value);
}

function getId(item, documentedKey) {
  return toId(item?.[documentedKey] || item?._id || item?.id);
}

// function normalizeGame(game) {
//   if (!game) return null;
//   return {
//     ...game,
//     gameId: getId(game, "gameId"),
//     activePlayerId: toId(game.activePlayerId),
//     activeDiceSetId: toId(game.activeDiceSetId),
//     name: game.name || "Untitled game",
//     game: game.game || "Unknown system",
//     players: (game.players || []).map(normalizePlayer),
//     dice: (game.dice || game.die || []).map(normalizeDie),
//     diceSets: (game.diceSets || []).map(normalizeDiceSet),
//   };
// }

// function normalizePlayer(player) {
//   if (!player) return null;
//   return { ...player, playerId: getId(player, "playerId") };
// }

// function normalizeDie(die) {
//   if (!die) return null;
//   return { ...die, dieId: getId(die, "dieId") };
// }

function normalizeDiceSet(diceSet) {
  if (!diceSet) return null;
  return { ...diceSet, diceSetId: getId(diceSet, "diceSetId"), dice: (diceSet.dice || []).map(toId) };
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


function PlayerPage({ params, token }) {
  const [game, setGame] = useState(null);
  const [player, setPlayer] = useState(null);
  const [roll, setRoll] = useState(null);
  const [rollInstructions, setRollInstructions] = useState(null);

   async function tokenVerification(){
    if (!token){
        throw new Error("No token provided");
    }

    const response = await api.get(`/accounts/${params.acctId}`, {
      headers: authHeaders(token)});
    if (response.status !== 200) {
      throw new Error("Token invalid or expired");
    } 
  }

  async function loadPlayerPage() {
    try {
      await tokenVerification();
      const players = await api.get(`/accounts/${params.acctId}/games/${params.gameId}/players`);
      const currentGame = await api.get(`/accounts/${params.acctId}/games/${params.gameId}`);

      setPlayer(players.data);
      setGame(currentGame.data);
    } catch (error) {
      console.error("Failed to load player page:", error);
      // Optionally set error state or redirect
    }
  }


  useEffect(() => {
    loadPlayerPage().catch((error) => console.log(error));
  }, [params.acctId, params.gameId, params.playerId, token]);

  async function rollDice() {
    setRoll(null);
    let outcomes = [];
    try {
      const response = await api.post(`/accounts/${params.acctId}/games/${params.gameId}/Roll`, {
        from: params.playerId,
        playerId: params.playerId
      }, {
        headers: authHeaders(token || "")
      });
      console.log("Roll response data:", response.data.outcomes);
      setRoll(response.data);
      await loadPlayerPage();
    } catch (error) {
      console.error("Roll failed:", error);
    }
  }

  const activeForPlayer = game?.activePlayerId === params.playerId;
  const activeDiceSet = game?.diceSets?.map(normalizeDiceSet).find((set) => set.diceSetId === game.activeDiceSetId);

  return (
    <main className="app-shell player-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">{game?.game || "Game"}</p>
        <h1>{game?.name || "Loading game"}</h1>
        <h2>{player?.username || "Loading player"}</h2>
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