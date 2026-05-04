import { useEffect, useMemo, useState } from "react";
import "../styles.css";

const API_BASE = "http://localhost:3000";

async function api(path, { token, method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : text;

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }

  return data;
}

function getId(item) {
  return item?._id || item?.gameId || item?.playerId || item?.dieId || item?.diceSetId;
}

function unwrapGame(data) {
  return data?.game || data;
}

function Roller({ session = {} }) {
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [diceSetId, setDiceSetId] = useState("");
  const [lastRoll, setLastRoll] = useState(null);
  const [error, setError] = useState("");

  const selectedDiceSet = useMemo(() => {
    return game?.diceSets?.find((set) => getId(set) === diceSetId);
  }, [game, diceSetId]);

  const selectedDice = useMemo(() => {
    if (!game || !selectedDiceSet) return [];

    return selectedDiceSet.dice
      .map((dieId) => game.dice.find((die) => getId(die) === dieId))
      .filter(Boolean);
  }, [game, selectedDiceSet]);

  async function loadGame() {
    const data = await api(
      `/accounts/${session.acctId}/games/${session.selectedGameId}`
    );

    const loadedGame = unwrapGame(data);

    setGame(loadedGame);
    setPlayerId(loadedGame.activePlayerId || getId(loadedGame.players?.[0]) || "");
    setDiceSetId(loadedGame.activeDiceSetId || getId(loadedGame.diceSets?.[0]) || "");
  }

  async function rollDice() {
    try {
      setError("");
      setLastRoll(null);

      await api(`/accounts/${session.acctId}/games/${session.selectedGameId}`, {
        token: session.token,
        method: "PATCH",
        body: {
          activePlayerId: playerId,
          activeDiceSetId: diceSetId,
        },
      });

      const result = await api(
        `/accounts/${session.acctId}/games/${session.selectedGameId}/Roll`,
        {
          token: session.token,
          method: "POST",
          body: {
            from: playerId,
          },
        }
      );

      setLastRoll(result);
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (session.acctId && session.selectedGameId) {
      loadGame().catch((err) => setError(err.message));
    }
  }, [session.acctId, session.selectedGameId]);

  if (!session.acctId || !session.selectedGameId) {
    return (
      <main className="appPage">
        <section className="pageHeader">
          <p className="eyebrow">Bonus Roll</p>
          <h1>Roller</h1>
          <p className="errorText">Log in and select a game in Settings first.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="appPage">
      <section className="pageHeader">
        <p className="eyebrow">Bonus Roll</p>
        <h1>Roller</h1>
        <p className="muted">
          Select the player who is rolling, choose the dice set, then roll.
        </p>
      </section>

      <section className="panelGrid">
        <div className="panel">
          <h2>Roll Setup</h2>

          <label>
            Player
            <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              {game?.players?.map((player) => (
                <option key={getId(player)} value={getId(player)}>
                  {player.username}
                </option>
              ))}
            </select>
          </label>

          <label>
            Dice Set
            <select value={diceSetId} onChange={(e) => setDiceSetId(e.target.value)}>
              {game?.diceSets?.map((set) => (
                <option key={getId(set)} value={getId(set)}>
                  {set.diceSetName}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primaryButton"
            onClick={rollDice}
            disabled={!playerId || !diceSetId}
          >
            Roll
          </button>

          {error && <p className="errorText">{error}</p>}
        </div>

        <div className="panel">
          <h2>Dice in Set</h2>

          <div className="diceTray">
            {selectedDice.map((die) => (
              <div
                key={getId(die)}
                className="dieTile"
                style={{ borderColor: die.color }}
              >
                <span>{die.dieName}</span>
                <strong>{die.faceValues.join(", ")}</strong>
              </div>
            ))}
          </div>

          {!selectedDice.length && (
            <p className="muted">This dice set has no dice selected.</p>
          )}
        </div>

        <div className="panel resultPanel">
          <h2>Result</h2>

          {lastRoll ? (
            <>
              <div className="scoreBubble">{lastRoll.score}</div>

              {lastRoll.rolls && (
                <div className="itemList">
                  {lastRoll.rolls.map((roll, index) => (
                    <span key={index}>
                      Die {index + 1}: {roll}
                    </span>
                  ))}
                </div>
              )}

              {lastRoll.timestamp && (
                <p className="muted">{lastRoll.timestamp}</p>
              )}
            </>
          ) : (
            <p className="muted">No roll yet.</p>
          )}
        </div>

        <div className="panel">
          <h2>Roll History</h2>

          <div className="itemList">
            {selectedDiceSet?.rollHistory?.map((entry, index) => (
              <span key={index}>
                {entry.score}
              </span>
            ))}
          </div>

          {!selectedDiceSet?.rollHistory?.length && (
            <p className="muted">No previous rolls for this dice set.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default Roller;
