import { useEffect, useMemo, useState } from "react";
import "./styles.css";

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

function LoginPage({ onLogin, onNavigate }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await apiRequest("/accounts/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onLogin(data);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>Bonus Roll</h1>
        <h2>DM Login</h2>
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          <button type="submit">Log In</button>
        </form>
        <Message message={message} />
        <button className="text-button" onClick={() => onNavigate("create")}>
          Create a DM account
        </button>
      </section>
    </main>
  );
}

function CreateAccountPage({ onCreate, onNavigate }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);
    try {
      await apiRequest("/accounts", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const login = await apiRequest("/accounts/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreate(login);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <h1>Bonus Roll</h1>
        <h2>Create DM Account</h2>
        <form onSubmit={handleSubmit} className="stack">
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
            />
          </label>
          <button type="submit">Create Account</button>
        </form>
        <Message message={message} />
        <button className="text-button" onClick={() => onNavigate("login")}>
          Back to login
        </button>
      </section>
    </main>
  );
}

function ManageGamesPage({ session, onLogout }) {
  const [games, setGames] = useState([]);
  const [activeGameId, setActiveGameId] = useState("");
  const [accountForm, setAccountForm] = useState({ username: "", password: "" });
  const [gameForm, setGameForm] = useState({ name: "", game: "" });
  const [playerName, setPlayerName] = useState("");
  const [dieForm, setDieForm] = useState({
    dieName: "",
    faceValues: "1,2,3,4,5,6",
    frequencyDist: "1,1,1,1,1,1",
    color: "blue",
  });
  const [diceSetForm, setDiceSetForm] = useState({
    diceSetName: "",
    dice: "",
    scoring: "Scoring instructions",
  });
  const [activation, setActivation] = useState({ activePlayerId: "", activeDiceSetId: "" });
  const [message, setMessage] = useState(null);
  const activeGame = useMemo(
    () => games.find((game) => game.gameId === activeGameId) || games[0] || null,
    [games, activeGameId],
  );

  async function loadGames(preferredGameId = "") {
    const data = await apiRequest(`/accounts/${session.acctId}/games`);
    const nextGames = (data.games || []).map(normalizeGame);
    setGames(nextGames);
    setActiveGameId((current) => {
      if (preferredGameId && nextGames.some((game) => game.gameId === preferredGameId)) return preferredGameId;
      if (current && nextGames.some((game) => game.gameId === current)) return current;
      return nextGames[0]?.gameId || "";
    });
  }

  useEffect(() => {
    loadGames().catch((error) => setMessage({ type: "error", text: error.message }));
  }, [session.acctId]);

  async function refreshGame(gameId = activeGame?.gameId) {
    if (!gameId) return;
    const data = await apiRequest(`/accounts/${session.acctId}/games/${gameId}`);
    const nextGame = normalizeGame(data.game || data);
    if (!nextGame?.gameId) {
      await loadGames(gameId);
      return;
    }
    setGames((current) => current.map((game) => (game.gameId === gameId ? nextGame : game)));
  }

  async function updateAccount(event) {
    event.preventDefault();
    setMessage(null);
    const body = {};
    if (accountForm.username) body.username = accountForm.username;
    if (accountForm.password) body.password = accountForm.password;

    try {
      await apiRequest(`/accounts/${session.acctId}`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify(body),
      });
      setAccountForm({ username: "", password: "" });
      setMessage({ type: "success", text: "Account updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete this DM account and all games?")) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}`, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      onLogout();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function createGame(event) {
    event.preventDefault();
    setMessage(null);
    try {
      const data = await apiRequest(`/accounts/${session.acctId}/games`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify(gameForm),
      });
      const createdGameId = getId(data.game || data, "gameId");
      await loadGames(createdGameId);
      setGameForm({ name: "", game: "" });
      setMessage({ type: "success", text: "Game created." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function deleteGame(gameId) {
    if (!window.confirm("Delete this game and all of its players, dice, and dice sets?")) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${gameId}`, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      setGames((current) => current.filter((game) => game.gameId !== gameId));
      setActiveGameId("");
      setMessage({ type: "success", text: "Game deleted." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function patchGame(game) {
    const name = window.prompt("Game name", game.name);
    if (!name) return;
    const system = window.prompt("Game system", game.game);
    if (!system) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${game.gameId}`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify({ name, game: system }),
      });
      await refreshGame(game.gameId);
      setMessage({ type: "success", text: "Game updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function replaceGame(game) {
    if (!window.confirm("Reset this game? This clears players, dice, dice sets, and roll history.")) return;
    const name = window.prompt("Game name", game.name);
    if (!name) return;
    const system = window.prompt("Game system", game.game);
    if (!system) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${game.gameId}`, {
        method: "PUT",
        headers: authHeaders(session.token),
        body: JSON.stringify({ name, game: system }),
      });
      await refreshGame(game.gameId);
      setMessage({ type: "success", text: "Game reset." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function createPlayer(event) {
    event.preventDefault();
    if (!activeGame) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/players`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({ username: playerName }),
      });
      setPlayerName("");
      await loadGames(activeGame.gameId);
      setMessage({ type: "success", text: "Player created." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function renamePlayer(player) {
    if (!activeGame) return;
    const username = window.prompt("Player name", player.username);
    if (!username) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/players/${player.playerId}`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify({ username }),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Player updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function replacePlayer(player) {
    if (!activeGame) return;
    const username = window.prompt("Replacement player name", player.username);
    if (!username) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/players/${player.playerId}`, {
        method: "PUT",
        headers: authHeaders(session.token),
        body: JSON.stringify({ username }),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Player replaced." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function copyPlayerLink(link) {
    if (!activeGame) return;
    navigator.clipboard.writeText(link);
  }

  async function deletePlayer(player) {
    if (!activeGame || !window.confirm(`Remove ${player.username}?`)) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/players/${player.playerId}`, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Player removed." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function createDie(event) {
    event.preventDefault();
    if (!activeGame) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/die`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({
          dieName: dieForm.dieName,
          faceValues: parseListInput(dieForm.faceValues),
          frequencyDist: parseListInput(dieForm.frequencyDist).map(Number),
          color: dieForm.color,
        }),
      });
      setDieForm({ dieName: "", faceValues: "1,2,3,4,5,6", frequencyDist: "1,1,1,1,1,1", color: "blue" });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Die created." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function patchDie(die) {
    if (!activeGame) return;
    const dieName = window.prompt("Die name", die.dieName);
    if (!dieName) return;
    const color = window.prompt("Color", die.color);
    if (!color) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/die/${die.dieId}`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify({ dieName, color }),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Die updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function copyDieID(die) {
    if (!activeGame) return;
    navigator.clipboard.writeText(die.dieId);
  }

  async function deleteDie(die) {
    if (!activeGame || !window.confirm(`Delete ${die.dieName}?`)) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/die/${die.dieId}`, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Die deleted." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function createDiceSet(event) {
    console.log("Creating dice set with form data:", diceSetForm);
    event.preventDefault();
    if (!activeGame) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/diceSet`, {
        method: "POST",
        headers: authHeaders(session.token),
        body: JSON.stringify({
          diceSetName: diceSetForm.diceSetName,
          dice: parseListInput(diceSetForm.dice),
          scoring: diceSetForm.scoring,
        }),
      });
      setDiceSetForm({ diceSetName: "", dice: "", scoring: "Scoring instructions" });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Dice set created." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function patchDiceSet(diceSet) {
    if (!activeGame) return;
    const diceSetName = window.prompt("Dice set name", diceSet.diceSetName);
    if (!diceSetName) return;
    const dice = window.prompt("Die IDs", (diceSet.dice || []).join(","));
    if (!dice) return;
    const scoring = window.prompt("Scoring", diceSet.scoring);
    if (!scoring) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/diceSet/${diceSet.diceSetId}`, {
        method: "PUT",
        headers: authHeaders(session.token),
        body: JSON.stringify({ diceSetName, dice: parseListInput(dice), scoring }),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Dice set replaced." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function deleteDiceSet(diceSet) {
    if (!activeGame || !window.confirm(`Delete ${diceSet.diceSetName}?`)) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}/diceSet/${diceSet.diceSetId}`, {
        method: "DELETE",
        headers: authHeaders(session.token),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Dice set deleted." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  async function setActiveRoll(event) {
    event.preventDefault();
    if (!activeGame) return;
    setMessage(null);
    try {
      await apiRequest(`/accounts/${session.acctId}/games/${activeGame.gameId}`, {
        method: "PATCH",
        headers: authHeaders(session.token),
        body: JSON.stringify(activation),
      });
      await refreshGame(activeGame.gameId);
      setMessage({ type: "success", text: "Active player and dice set updated." });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Manage Games</h1>
          <p>DM account {session.acctId}</p>
        </div>
        <button className="secondary" onClick={onLogout}>Log Out</button>
      </header>

      <Message message={message} />

      <section className="grid two">
        <div className="panel">
          <h2>DM Account</h2>
          <form onSubmit={updateAccount} className="stack">
            <input value={accountForm.username} onChange={(event) => setAccountForm({ ...accountForm, username: event.target.value })} placeholder="New username" />
            <input type="password" value={accountForm.password} onChange={(event) => setAccountForm({ ...accountForm, password: event.target.value })} placeholder="New password" />
            <div className="button-row">
              <button type="submit">Update Account</button>
              <button type="button" className="danger" onClick={deleteAccount}>Delete Account</button>
            </div>
          </form>
        </div>

        <div className="panel">
          <h2>Create Game</h2>
          <form onSubmit={createGame} className="stack">
            <label>
              Game name
              <input value={gameForm.name} onChange={(event) => setGameForm({ ...gameForm, name: event.target.value })} required />
            </label>
            <label>
              Game system
              <input value={gameForm.game} onChange={(event) => setGameForm({ ...gameForm, game: event.target.value })} required />
            </label>
            <button type="submit">Create Game</button>
          </form>
        </div>

        <div className="panel">
          <h2>Your Games</h2>
          <div className="list">
            {games.map((game) => (
              <button
                key={game.gameId}
                className={activeGame?.gameId === game.gameId ? "row active-row" : "row"}
                onClick={() => setActiveGameId(game.gameId)}
              >
                <span>{game.name}</span>
                <small>{game.game}</small>
              </button>
            ))}
            {!games.length && <p className="muted">No games yet.</p>}
          </div>
        </div>
      </section>

      {activeGame && (
        <section className="grid three">
          <div className="panel">
            <div className="panel-heading">
              <h2>{activeGame.name}</h2>
              <button className="danger" onClick={() => deleteGame(activeGame.gameId)}>Delete</button>
            </div>
            <div className="button-row">
              <button className="secondary" onClick={() => patchGame(activeGame)}>Edit</button>
              <button className="danger" onClick={() => replaceGame(activeGame)}>Reset</button>
            </div>
            <dl>
              <dt>System</dt>
              <dd>{activeGame.game}</dd>
              <dt>Game ID</dt>
              <dd>{activeGame.gameId}</dd>
              <dt>Active player</dt>
              <dd>{activeGame.activePlayerId || "None"}</dd>
              <dt>Active dice set</dt>
              <dd>{activeGame.activeDiceSetId || "None"}</dd>
            </dl>
          </div>

          <div className="panel">
            <h2>Players</h2>
            <form onSubmit={createPlayer} className="inline-form">
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Player name" required />
              <button type="submit">Add</button>
            </form>
            <div className="list compact-list">
              {activeGame.players.map((rawPlayer) => {
                const player = normalizePlayer(rawPlayer);
                return (
                  <div className="data-row" key={player.playerId}>
                    <div>
                      <strong>{player.username}</strong>
                      <small>{player.playerId}</small>
                    </div>
                    <input readOnly value={playerLink(session.acctId, activeGame.gameId, player.playerId)} onFocus={(event) => event.target.select()} />
                    <div className="button-row">
                      <button className="secondary" onClick={() => renamePlayer(player)}>Rename</button>
                      <button className="secondary" onClick={() => copyPlayerLink(playerLink(session.acctId, activeGame.gameId, player.playerId))}>Copy Link</button>
                      <button className="danger" onClick={() => deletePlayer(player)}>Remove</button>
                    </div>
                  </div>
                );
              })}
              {!activeGame.players.length && <p className="muted">Add players to generate links.</p>}
            </div>
          </div>

          <div className="panel">
            <h2>Set Active Roll</h2>
            <form onSubmit={setActiveRoll} className="stack">
              <label>
                Player
                <select value={activation.activePlayerId} onChange={(event) => setActivation({ ...activation, activePlayerId: event.target.value })} required>
                  <option value="">Choose player</option>
                  {activeGame.players.map((rawPlayer) => {
                    const player = normalizePlayer(rawPlayer);
                    return <option key={player.playerId} value={player.playerId}>{player.username}</option>;
                  })}
                </select>
              </label>
              <label>
                Dice set
                <select value={activation.activeDiceSetId} onChange={(event) => setActivation({ ...activation, activeDiceSetId: event.target.value })} required>
                  <option value="">Choose dice set</option>
                  {activeGame.diceSets.map((rawDiceSet) => {
                    const diceSet = normalizeDiceSet(rawDiceSet);
                    return <option key={diceSet.diceSetId} value={diceSet.diceSetId}>{diceSet.diceSetName}</option>;
                  })}
                </select>
              </label>
              <button type="submit">Arm Roll</button>
            </form>
          </div>

          <div className="panel">
            <h2>Create Die</h2>
            <form onSubmit={createDie} className="stack">
              <input value={dieForm.dieName} onChange={(event) => setDieForm({ ...dieForm, dieName: event.target.value })} placeholder="Die name" required />
              <input value={dieForm.faceValues} onChange={(event) => setDieForm({ ...dieForm, faceValues: event.target.value })} placeholder="Face values" required />
              <input value={dieForm.frequencyDist} onChange={(event) => setDieForm({ ...dieForm, frequencyDist: event.target.value })} placeholder="Frequency distribution" required />
              <input value={dieForm.color} onChange={(event) => setDieForm({ ...dieForm, color: event.target.value })} placeholder="Color" required />
              <button type="submit">Create Die</button>
            </form>
            <div className="list compact-list">
              {activeGame.dice.map((rawDie) => {
                const die = normalizeDie(rawDie);
                return (
                  <div className="data-row" key={die.dieId}>
                    <strong>{die.dieName}</strong>
                    <small>{die.dieId}</small>
                    <div className="button-row">
                      <button className="secondary" onClick={() => patchDie(die)}>Edit</button>
                      <button className="secondary" onClick={() => copyDieID(die)}>Copy ID</button>
                      <button className="danger" onClick={() => deleteDie(die)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel wide">
            <h2>Create Dice Set</h2>
            <form onSubmit={createDiceSet} className="stack">
              <input value={diceSetForm.diceSetName} onChange={(event) => setDiceSetForm({ ...diceSetForm, diceSetName: event.target.value })} placeholder="Dice set name" required />
              <input value={diceSetForm.dice} onChange={(event) => setDiceSetForm({ ...diceSetForm, dice: event.target.value })} placeholder="Die IDs, comma separated" required />
              <textarea value={diceSetForm.scoring} onChange={(event) => setDiceSetForm({ ...diceSetForm, scoring: event.target.value })} rows="5" required />
              <button type="submit">Create Dice Set</button>
            </form>
            <div className="list compact-list">
              {activeGame.diceSets.map((rawDiceSet) => {
                const diceSet = normalizeDiceSet(rawDiceSet);
                return (
                  <div className="data-row" key={diceSet.diceSetId}>
                    <div>
                      <strong>{diceSet.diceSetName}</strong>
                      <small>{diceSet.diceSetId}</small>
                    </div>
                    <small>{(diceSet.dice || []).join(", ")}</small>
                    <div className="button-row">
                      <button className="secondary" onClick={() => patchDiceSet(diceSet)}>Edit</button>
                      <button className="danger" onClick={() => deleteDiceSet(diceSet)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
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
    try {
      const data = await apiRequest(`/accounts/${params.acctId}/games/${params.gameId}/Roll`, {
        method: "POST",
        headers: authHeaders(localStorage.getItem("token") || ""),
        body: JSON.stringify({ from: params.playerId, playerId: params.playerId }),
      });
      console.log("Roll response data:", data);
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
            <span>{roll.scoring}</span>
          </div>
        )}
      </section>
    </main>
  );
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
