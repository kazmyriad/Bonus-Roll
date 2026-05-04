import { useMemo, useState } from "react";
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
  const data = text ? JSON.parse(text) : null;

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

function parseNumberList(value) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function Settings({ session = {}, setSession }) {
  const [acctId, setAcctId] = useState(session.acctId || "");
  const [token, setToken] = useState(session.token || "");
  const [games, setGames] = useState([]);
  const [game, setGame] = useState(null);
  const [selectedGameId, setSelectedGameId] = useState(session.selectedGameId || "");

  const [newGameName, setNewGameName] = useState("");
  const [newGameType, setNewGameType] = useState("Dungeons & Dragons");
  const [editGameName, setEditGameName] = useState("");
  const [editGameType, setEditGameType] = useState("");

  const [newPlayerName, setNewPlayerName] = useState("");

  const [dieName, setDieName] = useState("");
  const [dieColor, setDieColor] = useState("#2f80ed");
  const [faceValues, setFaceValues] = useState("1,2,3,4,5,6");
  const [frequencyDist, setFrequencyDist] = useState("1,1,1,1,1,1");

  const [diceSetName, setDiceSetName] = useState("");
  const [selectedDiceIds, setSelectedDiceIds] = useState([]);
  const [scoring, setScoring] = useState("return $0");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canUseAccount = Boolean(acctId);
  const canUseDmRoutes = Boolean(acctId && token);
  const canUseGameRoutes = Boolean(acctId && selectedGameId);

  const diceById = useMemo(() => {
    const pairs = game?.dice?.map((die) => [getId(die), die]) || [];
    return new Map(pairs);
  }, [game]);

  function rememberSelectedGame(gameId) {
    setSelectedGameId(gameId);

    if (setSession) {
      setSession((previous) => ({
        ...previous,
        acctId,
        token,
        selectedGameId: gameId,
      }));
    }
  }

  async function loadGames() {
    if(!token){
      setError("You must be a DM in order to create a game");
      return;
    }
    try {
      setError("");
      setMessage("");

      const data = await api(`/accounts/${acctId}/games`);
      setGames(data.games || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadGame(gameId = selectedGameId) {
    try {
      setError("");
      setMessage("");

      const data = await api(`/accounts/${acctId}/games/${gameId}`);
      const loadedGame = unwrapGame(data);

      setGame(loadedGame);
      setEditGameName(loadedGame.name || "");
      setEditGameType(loadedGame.game || "");
      rememberSelectedGame(getId(loadedGame) || gameId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createGame() {
    try {
      setError("");
      setMessage("");

      const data = await api(`/accounts/${acctId}/games`, {
        token,
        method: "POST",
        body: {
          name: newGameName,
          game: newGameType,
        },
      });

      setNewGameName("");
      setMessage("Game created.");
      await loadGames();
      await loadGame(data.gameId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function patchGame() {
    try {
      setError("");
      setMessage("");

      await api(`/accounts/${acctId}/games/${selectedGameId}`, {
        token,
        method: "PATCH",
        body: {
          name: editGameName,
          game: editGameType,
        },
      });

      setMessage("Game updated.");
      await loadGames();
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  async function replaceGame() {
    try {
      setError("");
      setMessage("");

      await api(`/accounts/${acctId}/games/${selectedGameId}`, {
        token,
        method: "PUT",
        body: {
          name: editGameName,
          game: editGameType,
        },
      });

      setMessage("Game replaced and reset.");
      await loadGames();
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addPlayer() {
    try {
      setError("");
      setMessage("");

      await api(`/accounts/${acctId}/games/${selectedGameId}/players`, {
        token,
        method: "POST",
        body: { username: newPlayerName },
      });

      setNewPlayerName("");
      setMessage("Player added.");
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addDie() {
    try {
      setError("");
      setMessage("");

      await api(`/accounts/${acctId}/games/${selectedGameId}/die`, {
        token,
        method: "POST",
        body: {
          dieName,
          faceValues: parseNumberList(faceValues),
          frequencyDist: parseNumberList(frequencyDist),
          color: dieColor,
        },
      });

      setDieName("");
      setMessage("Die template added.");
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addDiceSet() {
    try {
      setError("");
      setMessage("");

      await api(`/accounts/${acctId}/games/${selectedGameId}/diceSet`, {
        token,
        method: "POST",
        body: {
          diceSetName,
          dice: selectedDiceIds,
          scoring,
        },
      });

      setDiceSetName("");
      setSelectedDiceIds([]);
      setScoring("return $0");
      setMessage("Dice set created.");
      await loadGame();
    } catch (err) {
      setError(err.message);
    }
  }

  function toggleDie(dieId) {
    setSelectedDiceIds((current) =>
      current.includes(dieId)
        ? current.filter((id) => id !== dieId)
        : [...current, dieId]
    );
  }

  return (
    <main className="appPage">
      <section className="pageHeader">
        <p className="eyebrow">Game Setup</p>
        <h1>Settings</h1>
        <p className="muted">Create games, players, die templates, and rollable dice sets.</p>
      </section>

      <section className="panelGrid">
        <div className="panel">
          <h2>Session</h2>

          <label>
            Account ID
            <input value={acctId} onChange={(event) => setAcctId(event.target.value)} />
          </label>

          <label>
            Authorization Token
            <input value={token} onChange={(event) => setToken(event.target.value)} />
          </label>

          <button className="secondaryButton" onClick={loadGames} disabled={!accId || !token}>
            Load Games
          </button>
        </div>

        <div className="panel">
          <h2>Games</h2>

          <label>
            New Game Name
            <input value={newGameName} onChange={(event) => setNewGameName(event.target.value)} />
          </label>

          <label>
            Game Type
            <input value={newGameType} onChange={(event) => setNewGameType(event.target.value)} />
          </label>

          <button className="primaryButton" onClick={createGame} disabled={!canUseDmRoutes || !newGameName}>
            Create Game
          </button>

          <div className="itemList">
            {games.map((item) => (
              <button key={getId(item)} onClick={() => loadGame(getId(item))}>
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Edit Game</h2>

          <label>
            Selected Game ID
            <input
              value={selectedGameId}
              onChange={(event) => rememberSelectedGame(event.target.value)}
            />
          </label>

          <button className="secondaryButton" onClick={() => loadGame()} disabled={!canUseGameRoutes}>
            Load Selected Game
          </button>

          <label>
            Game Name
            <input value={editGameName} onChange={(event) => setEditGameName(event.target.value)} />
          </label>

          <label>
            Game Type
            <input value={editGameType} onChange={(event) => setEditGameType(event.target.value)} />
          </label>

          <button className="secondaryButton" onClick={patchGame} disabled={!canUseDmRoutes || !selectedGameId}>
            Save Changes
          </button>

          <button className="secondaryButton" onClick={replaceGame} disabled={!canUseDmRoutes || !selectedGameId}>
            Replace and Reset
          </button>
        </div>

        <div className="panel">
          <h2>Players</h2>

          <label>
            Player Name
            <input value={newPlayerName} onChange={(event) => setNewPlayerName(event.target.value)} />
          </label>

          <button className="secondaryButton" onClick={addPlayer} disabled={!canUseDmRoutes || !selectedGameId}>
            Add Player
          </button>

          <div className="itemList">
            {game?.players?.map((player) => (
              <span key={getId(player)}>{player.username}</span>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Die Templates</h2>

          <label>
            Die Name
            <input value={dieName} onChange={(event) => setDieName(event.target.value)} />
          </label>

          <label>
            Face Values
            <input value={faceValues} onChange={(event) => setFaceValues(event.target.value)} />
          </label>

          <label>
            Frequency Distribution
            <input value={frequencyDist} onChange={(event) => setFrequencyDist(event.target.value)} />
          </label>

          <label>
            Color
            <input type="color" value={dieColor} onChange={(event) => setDieColor(event.target.value)} />
          </label>

          <button className="secondaryButton" onClick={addDie} disabled={!canUseDmRoutes || !selectedGameId}>
            Add Die
          </button>

          <div className="diceTray">
            {game?.dice?.map((die) => (
              <button
                key={getId(die)}
                className={selectedDiceIds.includes(getId(die)) ? "dieTile selectedDie" : "dieTile"}
                style={{ borderColor: die.color }}
                onClick={() => toggleDie(getId(die))}
              >
                <span>{die.dieName}</span>
                <strong>{die.faceValues.join(", ")}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Dice Sets</h2>

          <label>
            Dice Set Name
            <input value={diceSetName} onChange={(event) => setDiceSetName(event.target.value)} />
          </label>

          <label>
            Scoring Rule
            <textarea value={scoring} onChange={(event) => setScoring(event.target.value)} />
          </label>

          <button
            className="primaryButton"
            onClick={addDiceSet}
            disabled={!canUseDmRoutes || !selectedGameId || selectedDiceIds.length === 0}
          >
            Create Dice Set
          </button>

          <div className="itemList">
            {game?.diceSets?.map((set) => (
              <span key={getId(set)}>
                {set.diceSetName}: {set.dice?.map((dieId) => diceById.get(dieId)?.dieName || dieId).join(", ")}
              </span>
            ))}
          </div>
        </div>
      </section>

      {message && <p className="successText">{message}</p>}
      {error && <p className="errorText">{error}</p>}
    </main>
  );
}

export default Settings;
