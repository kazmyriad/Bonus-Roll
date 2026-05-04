import { useEffect, useMemo, useState } from "react";
import "../styles.css";

const API_BASE = "http://localhost:3000";

function Roller() {
  const [acctId, setAcctId] = useState(localStorage.getItem("acctId") || "");
  const [gameId, setGameId] = useState(localStorage.getItem("gameId") || "");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [diceSetId, setDiceSetId] = useState("");
  const [lastRoll, setLastRoll] = useState(null);
  const [error, setError] = useState("");

  const activeDiceSet = useMemo(
    () => game?.diceSets?.find((set) => set._id === diceSetId),
    [game, diceSetId]
  );

  async function api(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  async function loadGame() {
    setError("");
    const data = await api(`/accounts/${acctId}/games/${gameId}`);
    setGame(data.game);
    setPlayerId(data.game.activePlayerId || data.game.players?.[0]?._id || "");
    setDiceSetId(data.game.activeDiceSetId || data.game.diceSets?.[0]?._id || "");
  }

  async function rollDice() {
    try {
      setError("");
      setLastRoll(null);

      await api(`/accounts/${acctId}/games/${gameId}`, {
        method: "PATCH",
        body: JSON.stringify({
          activePlayerId: playerId,
          activeDiceSetId: diceSetId,
        }),
      });

      const result = await api(`/accounts/${acctId}/games/${gameId}/Roll`, {
        method: "POST",
        body: JSON.stringify({ playerId }),
      });

      setLastRoll(result);
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (acctId && gameId) {
      loadGame().catch((err) => setError(err.message));
    }
  }, []);

  return (
    <main className="rollerPage">
      <section className="rollerHero">
        <div>
          <h1>Dice Roller</h1>
          <p className="rollerSubtitle">
            Pick a player, choose a dice set, and roll.
          </p>
        </div>

        <button className="primaryRollButton" onClick={rollDice} disabled={!playerId || !diceSetId}>
          Roll
        </button>
      </section>

      <section className="rollerGrid">
        <div className="rollerPanel">
          <h2>Session</h2>

          <label>
            Account ID
            <input value={acctId} onChange={(e) => setAcctId(e.target.value)} />
          </label>

          <label>
            Game ID
            <input value={gameId} onChange={(e) => setGameId(e.target.value)} />
          </label>

          <label>
            Token
            <input value={token} onChange={(e) => setToken(e.target.value)} />
          </label>

          <button className="secondaryButton" onClick={loadGame}>
            Load Game
          </button>
        </div>

        <div className="rollerPanel">
          <h2>Roll Setup</h2>

          <label>
            Player
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              {game?.players?.map((player) => (
                <option key={player._id} value={player._id}>
                  {player.username}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dice Set
            <select value={diceSetId} onChange={(e) => setDiceSetId(e.target.value)}>
              {game?.diceSets?.map((set) => (
                <option key={set._id} value={set._id}>
                  {set.diceSetName}
                </option>
              ))}
            </select>
          </label>

          <div className="diceTray">
            {activeDiceSet?.dice?.map((dieId) => {
              const die = game.dice.find((item) => item._id === dieId);
              if (!die) return null;

              return (
                <div className="dieTile" key={die._id} style={{ borderColor: die.color }}>
                  <span>{die.dieName}</span>
                  <strong>{die.faceValues.join(", ")}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rollerPanel resultPanel">
          <h2>Result</h2>

          {lastRoll ? (
            <>
              <div className="scoreBubble">{lastRoll.score}</div>
              <p>Rolled from dice set {lastRoll.diceSet}</p>
            </>
          ) : (
            <p className="emptyState">No roll yet.</p>
          )}

          {error && <p className="errorText">{error}</p>}
        </div>
      </section>
    </main>
  );
}

export default Roller;