import { useEffect, useState } from "react";
import "../styles.css";

const API_BASE = "http://localhost:3000";

function Settings() {
  const [acctId] = useState(localStorage.getItem("acctId") || "");
  const [token] = useState(localStorage.getItem("token") || "");
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState(localStorage.getItem("gameId") || "");
  const [game, setGame] = useState(null);
  const [newGameName, setNewGameName] = useState("");
  const [newPlayer, setNewPlayer] = useState("");
  const [dieName, setDieName] = useState("");
  const [dieColor, setDieColor] = useState("#d95f2b");
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

  async function loadGames() {
    const data = await request(`/accounts/${acctId}/games`);
    setGames(data.games || []);
  }

  async function loadGame(id = gameId) {
    const data = await request(`/accounts/${acctId}/games/${id}`);
    setGame(data.game);
    setGameId(id);
    localStorage.setItem("gameId", id);
  }

  async function createGame() {
    try {
      setError("");
      const data = await request(`/accounts/${acctId}/games`, {
        method: "POST",
        body: JSON.stringify({
          name: newGameName,
          game: "Custom",
        }),
      });

      setNewGameName("");
      await loadGames();
      await loadGame(data.gameId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPlayer() {
    await request(`/accounts/${acctId}/games/${gameId}/players`, {
      method: "POST",
      body: JSON.stringify({ username: newPlayer }),
    });

    setNewPlayer("");
    await loadGame();
  }

  async function addBasicDie() {
    await request(`/accounts/${acctId}/games/${gameId}/die`, {
      method: "POST",
      body: JSON.stringify({
        dieName,
        faceValues: [1, 2, 3, 4, 5, 6],
        frequencyDist: [1, 1, 1, 1, 1, 1],
        color: dieColor,
      }),
    });

    setDieName("");
    await loadGame();
  }

  useEffect(() => {
    if (acctId) loadGames().catch((err) => setError(err.message));
  }, []);

  return (
    <main className="appPage">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">Game Setup</p>
          <h1>Settings</h1>
          <p className="muted">Create games, players, dice, and dice sets for rolling.</p>
        </div>
      </section>

      <section className="panelGrid">
        <div className="panel">
          <h2>Games</h2>

          <label>
            New Game
            <input value={newGameName} onChange={(e) => setNewGameName(e.target.value)} />
          </label>

          <button className="primaryButton" onClick={createGame}>Create Game</button>

          <div className="itemList">
            {games.map((item) => (
              <button key={item._id} onClick={() => loadGame(item._id)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Players</h2>

          <label>
            Player Name
            <input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} />
          </label>

          <button className="secondaryButton" onClick={addPlayer} disabled={!gameId}>
            Add Player
          </button>

          <div className="itemList">
            {game?.players?.map((player) => (
              <span key={player._id}>{player.username}</span>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Dice</h2>

          <label>
            Die Name
            <input value={dieName} onChange={(e) => setDieName(e.target.value)} />
          </label>

          <label>
            Color
            <input type="color" value={dieColor} onChange={(e) => setDieColor(e.target.value)} />
          </label>

          <button className="secondaryButton" onClick={addBasicDie} disabled={!gameId}>
            Add d6
          </button>

          <div className="diceTray">
            {game?.dice?.map((die) => (
              <div className="dieTile" key={die._id} style={{ borderColor: die.color }}>
                <span>{die.dieName}</span>
                <strong>{die.faceValues.join(", ")}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="errorText">{error}</p>}
    </main>
  );
}

export default Settings;
