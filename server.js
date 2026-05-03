/* adapted heavily from in-class Mongoose Slides... */

//KEEPING TRACK OF HTTP CODES:
/*
  200 - OK - for GET, PUT, PATCH, etc
  201 - Created - for POST
  204 - No content - for DELETE

  401 - Unauthorized - for all future 
  404 - ___ Not found - for incorrect id inputs
  409 - Conflict - mostly if someone tries to register the same name as someone else

*/

//Notes NOT Already in Group Project - Detailed Plan Document
/*
- bcrypt for hashing (bcrypt.hash(req.body.password, 12)) and checking passwords against a hash (bcrypt.compare(req.body.password, acct.hashed_password))
- jsonwebtoken for login - https://www.npmjs.com/package/jsonwebtoken - for jwt.sign & expiresIn
- extra functions: deleteActivePlayer, deleteActiveDiceSet, deleteActiveDice in case we accidentally PUT or DELETE on an already active player, dice, or dice set in a game

*/

//Mongoose
const connectDB  = require("./config/database");
const Account    = require("./models/accounts.model");

//Express
const express   = require("express");
const app = express();
app.use(express.json());

//STUFF THAT ISN'T FROM MONGOOSE SLIDES
const bcrypt = require("bcrypt"); // for hashing passwords for the database
const jwt = require("jsonwebtoken"); // for login/tokens

// for web token for login
const JWT_PRIVATE_KEY = "blahblahbblahblah a random hardcoded jsonwebtoken private key if this weren't a classroom project i'd be doing something a little more secure...";

// Token validation for all DM acct/game management requests that require login
//Note: everything that requires auth will no longer need username sent (& in fact they shouldn't!!! - think about PATCH requests, etc)
function auth(req, res, next){
  const token = req.headers.authorization;

  if(!token){ return res.status(401).json({ error: "Unauthorized - Please Login Before Proceeding" }); }

  try {
    const decoded = jwt.verify(token, JWT_PRIVATE_KEY);
    req.acct = decoded;
    next();
  } catch (err) { return res.status(401).json({ error: "Unauthorized - Please Login Before Proceeding" }); }
}

function deleteActivePlayer(game, player){
  if(game.activePlayerId && game.activePlayerId.equals(player._id)){
    game.activePlayerId = null;
  }
}

function deleteActiveDiceSet(game, diceSet){
  if(game.activeDiceSetId && game.activeDiceSetId.equals(diceSet._id)){
    game.activeDiceSetId = null;
  }
}

function deleteActiveDice(game, dice){
  game.diceSets = game.diceSets.filter(set => {
    if(set.dice.some( d => d._id.equals(dice._id))){
      deleteActiveDiceSet(game, set);
      return false;
    }
    return true;
  });
}

function clearRollHistory(game, die){
  game.diceSets.forEach(set => {
    if (set.dice.some( d => d._id.equals(die._id))) {
      set.rollHistory = [];
    }
  });
}




// ALL ENDPOINTS WILL BE ENUMERATED VIA THE Group Project - Detailed Plan document

/* --- ACCOUNT MANAGEMENT --- */
// 1) POST /accounts
app.post("/accounts", async (req, res) => {
  try {
    if (await Account.findOne({ username: req.body.username })) {
      return res.status(409).json({ error: "Username already taken" });
    }

    const hashed_password = await bcrypt.hash(req.body.password, 12); //had to look this up. 12 salt rounds is the default?


    const acct = await Account.create({username: req.body.username, hashed_password: hashed_password}) // just to ensure nothing more from req.body is passed...

    res.status(201).json({
      acctId: acct._id,
      username: acct.username,
      games: acct.games,
      created_at: acct.createdAt,
      updated_at: acct.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3) POST /accounts/login --- NOTE: I SWAPPED 2) & 3) SO THAT /login ISN'T COUNTED AS AN ID (even though this post request happens first anyways)
app.post("/accounts/login", async (req, res) => {
  try {
    const acct = await Account.findOne({ username: req.body.username });
    
    if (!acct) { return res.status(401).json({ error: "INVALID LOGIN INFO" })}
    if (!await bcrypt.compare(req.body.password, acct.hashed_password)) { return res.status(401).json({ error: "INVALID LOGIN INFO" })}

    const token = jwt.sign({acctId: acct._id}, JWT_PRIVATE_KEY, {expiresIn: "24h"})

    res.status(200).json({
      acctId: acct._id,
      token: token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2) GET /accounts/:acctId - requires auth
app.get("/accounts/:acctId", auth , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      res.status(200).json({
        acctId: acct._id,
        username: acct.username,
        games: acct.games,
        created_at: acct.createdAt,
        updated_at: acct.updatedAt,
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4) PATCH /accounts/:acctId - requires auth - only for username or password
app.patch("/accounts/:acctId", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot change someone else's username or password" }); }

    const acct = await Account.findById(req.params.acctId);

    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong


    //if we're changing the username
    if(req.body.username) {
      if (await Account.findOne({ username: req.body.username })) {
        return res.status(409).json({ error: "Username already taken" });
      }
      acct.username = req.body.username;
    }

    //if we're changing the password
    if(req.body.password) {
      acct.hashed_password = await bcrypt.hash(req.body.password, 12);
    }

    await acct.save(); // actually change the acct

    
    res.status(200).json({
        acctId: acct._id,
        username: acct.username,
        games: acct.games,
        created_at: acct.createdAt,
        updated_at: acct.updatedAt,
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5) DELETE /accounts/:acctId - requires auth - largely the same as patch
app.delete("/accounts/:acctId", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot delete someone else's account" }); }

    const acct = await Account.findById(req.params.acctId);

    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong

    acct.deleteOne();
    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* --- GAME MANAGEMENT --- */
// 6) POST /accounts/:acctId/games - requires auth
app.post("/accounts/:acctId/games", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot create game sessions for someone else's account" }); }

    const acct = await Account.findById(req.params.acctId);

    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong

    acct.games.push({
      name: req.body.name,
      game: req.body.game,
      activePlayerId: null,
      activeDiceSetId: null,
      players: [],
      dice: [],
      diceSets: []
    });
    await acct.save();

    const to_return = acct.games[acct.games.length - 1];

    res.status(201).json({
      acctId: acct._id,
      gameId: to_return._id,
      name: to_return.name,
      game: to_return.game,
      activePlayerId: to_return.activePlayerId,
      activeDiceSetId: to_return.activeDiceSetId,
      players: to_return.players,
      dice: to_return.dice,
      diceSets: to_return.diceSets,
      created_at: to_return.createdAt,
      updated_at: to_return.updatedAt,

    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 7) GET /accounts/:acctId/games - NO AUTH -
app.get("/accounts/:acctId/games" , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      res.status(200).json({
        acctId: acct._id,
        games: acct.games //phew !! this one was easy.. unless i'm missing something..
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// 8) GET /accounts/:acctId/games/:gameId - NO AUTH -
app.get("/accounts/:acctId/games/:gameId" , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      res.status(200).json({
        acctId: acct._id,
        game: game // relatively easy as well.. unless i'm missing something..
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 9) PATCH /accounts/:acctId/games/:gameId - AUTH REQUIRED - also for setting activePlayerId & activeDiceSetId 
app.patch("/accounts/:acctId/games/:gameId", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot change someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong

    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    if(req.body.name){ game.name = req.body.name; }
    if(req.body.game){ game.game = req.body.game; }
    if(req.body.activePlayerId){ game.activePlayerId = req.body.activePlayerId; }
    if(req.body.activeDiceSetId){ game.activeDiceSetId = req.body.activeDiceSetId; }

    await acct.save(); // actually change the acct

    res.status(200).json({
      acctId: acct._id,
      game: game
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 10) PUT /accounts/:acctId/games/:gameId - AUTH REQUIRED - resets everything too
app.put("/accounts/:acctId/games/:gameId", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot change someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong

    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    game.name = req.body.name;
    game.game = req.body.game;
    game.activePlayerId = null;
    game.activeDiceSetId = null;
    game.players = [];
    game.dice = [];
    game.diceSets = [];

    await acct.save(); // actually change the acct

    res.status(200).json({
      acctId: acct._id,
      game: game
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 11) DELETE /accounts/:acctId/games/:gameId - requires auth - largely the same as account deletion
app.delete("/accounts/:acctId/games/:gameId", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot change someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong

    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    game.deleteOne(); // again, no need for await as it's alr loaded in

    await acct.save();

    res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* --- PLAYER MANAGEMENT --- */
// 12) POST /accounts/:acctId/games/:gameId/players - requires auth
app.post("/accounts/:acctId/games/:gameId/players", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot add players to someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
    
    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    game.players.push({ username: req.body.username });

    await acct.save();

    res.status(201).json({
      acctId: acct._id,
      gameId: game._id,
      player: game.players[game.players.length - 1]
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 13) GET /accounts/:acctId/games/:gameId/players - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/players", async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);
      if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
      
      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        players: game.players
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 14) GET /accounts/:acctId/games/:gameId/players/:playerId - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/players/:playerId" , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const player = game.players.id(req.params.playerId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!player) { return res.status(404).json({ error: "Player not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        player: player
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 15) PATCH /accounts/:acctId/games/:gameId/players/:playerId - auth
app.patch("/accounts/:acctId/games/:gameId/players/:playerId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit players in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);


      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const player = game.players.id(req.params.playerId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!player) { return res.status(404).json({ error: "Player not found" })}

      if (req.body.username) { player.username = req.body.username; }

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        player: player
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 16) PUT /accounts/:acctId/games/:gameId/players/:playerId - auth
app.put("/accounts/:acctId/games/:gameId/players/:playerId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit players in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const player = game.players.id(req.params.playerId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!player) { return res.status(404).json({ error: "Player not found" })}

      player.username = req.body.username;

      deleteActivePlayer(game, player); // put replaces player, so they do get removed from active

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        player: player
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 17) DELETE /accounts/:acctId/games/:gameId/players/:playerId - auth
app.delete("/accounts/:acctId/games/:gameId/players/:playerId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot remove players in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const player = game.players.id(req.params.playerId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!player) { return res.status(404).json({ error: "Player not found" })}

      deleteActivePlayer(game, player);
      player.deleteOne();
      await acct.save();

      res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/* --- DICE MANAGEMENT --- */
// 18) POST /accounts/:acctId/games/:gameId/die - requires auth
app.post("/accounts/:acctId/games/:gameId/die", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot add dice to someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
    
    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    game.dice.push({
      dieName: req.body.dieName,
      faceValues: req.body.faceValues,
      frequencyDist: req.body.frequencyDist,
      color: req.body.color
    });

    await acct.save();

    const to_return = game.dice[game.dice.length - 1];

    res.status(201).json({
      acctId: acct._id,
      gameId: game._id,
      die: to_return
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 19) GET /accounts/:acctId/games/:gameId/die - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/die", async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);
      if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
      
      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        dice: game.dice
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 20) GET /accounts/:acctId/games/:gameId/die/:dieId - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/die/:dieId" , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const die = game.dice.id(req.params.dieId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!die) { return res.status(404).json({ error: "Die not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        die: die
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 21) PATCH /accounts/:acctId/games/:gameId/die/:dieId - auth
app.patch("/accounts/:acctId/games/:gameId/die/:dieId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit die in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);


      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const die = game.dice.id(req.params.dieId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!die) { return res.status(404).json({ error: "Die not found" })}

      if (req.body.dieName) { die.dieName = req.body.dieName; }
      if (req.body.faceValues) { die.faceValues = req.body.faceValues; }
      if (req.body.frequencyDist) { die.frequencyDist = req.body.frequencyDist; }
      if (req.body.color) { die.color = req.body.color; }

      clearRollHistory(game, die);

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        die: die
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 22) PUT /accounts/:acctId/games/:gameId/die/:dieId - auth
app.put("/accounts/:acctId/games/:gameId/die/:dieId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit die in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const die = game.dice.id(req.params.dieId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!die) { return res.status(404).json({ error: "Die not found" })}

      die.dieName = req.body.dieName;
      die.faceValues = req.body.faceValues;
      die.frequencyDist = req.body.frequencyDist;
      die.color = req.body.color;

      deleteActiveDice(game, die);

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        die: die
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 23) DELETE /accounts/:acctId/games/:gameId/die/:dieId - auth
app.delete("/accounts/:acctId/games/:gameId/die/:dieId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot remove die in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const die = game.dice.id(req.params.dieId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!die) { return res.status(404).json({ error: "Die not found" })}

      deleteActiveDice(game, die);
      die.deleteOne();
      await acct.save();

      res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


/* --- DICE SET MANAGEMENT --- */
// 24) POST /accounts/:acctId/games/:gameId/diceSet - requires auth
app.post("/accounts/:acctId/games/:gameId/diceSet", auth, async (req, res) => {
  try {
    if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot add dice to someone else's game" }); }

    const acct = await Account.findById(req.params.acctId);
    if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
    
    const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
    if (!game) { return res.status(404).json({ error: "Game not found" })}

    //VALIDATE DICE!!!!!
    if(!req.body.dice.every( id => game.dice.id(id)) ){
      return res.status(404).json({ error: "Die not found" });
    }

    game.diceSets.push({
      diceSetName: req.body.diceSetName,
      dice: req.body.dice,
      scoring: req.body.scoring,
      rollHistory: []
    });

    await acct.save();

    res.status(201).json({
      acctId: acct._id,
      gameId: game._id,
      diceSet: game.diceSets[game.diceSets.length - 1]
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 25) GET /accounts/:acctId/games/:gameId/diceSet - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/diceSet", async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);
      if (!acct) { return res.status(404).json({ error: "Account not found" })} // i feel like we'll never get here due to the auth step unless something really went wrong
      
      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        diceSets: game.diceSets
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 26) GET /accounts/:acctId/games/:gameId/diceSet/:diceSetId - NO AUTH -
app.get("/accounts/:acctId/games/:gameId/diceSet/:diceSetId" , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const diceSet = game.diceSets.id(req.params.diceSetId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!diceSet) { return res.status(404).json({ error: "Dice Set not found" })}

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        diceSet: diceSet
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 27) PATCH /accounts/:acctId/games/:gameId/diceSet/:diceSetId - auth
app.patch("/accounts/:acctId/games/:gameId/diceSet/:diceSetId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit die sets in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const diceSet = game.diceSets.id(req.params.diceSetId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!diceSet) { return res.status(404).json({ error: "Dice Set not found" })}

      if (req.body.diceSetName) { diceSet.diceSetName = req.body.diceSetName; }
      if (req.body.dice) { 
        //VALIDATE DIE !!!!
        if(!req.body.dice.every( id => game.dice.id(id)) ){
          return res.status(404).json({ error: "Die not found" });
        }
        diceSet.dice = req.body.dice;
      }
      if (req.body.scoring) { diceSet.scoring = req.body.scoring; }
      diceSet.rollHistory = [];

      deleteActiveDiceSet(game, diceSet);

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        diceSet: diceSet
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 28) PUT /accounts/:acctId/games/:gameId/diceSet/:diceSetId - auth
app.put("/accounts/:acctId/games/:gameId/diceSet/:diceSetId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot edit die sets in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const diceSet = game.diceSets.id(req.params.diceSetId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!diceSet) { return res.status(404).json({ error: "Dice Set not found" })}

      diceSet.diceSetName = req.body.diceSetName;
      //VALIDATE DIE !!!!
      if(!req.body.dice.every( id => game.dice.id(id)) ){
        return res.status(404).json({ error: "Die not found" });
      }
      diceSet.dice = req.body.dice;
      diceSet.scoring = req.body.scoring;

      diceSet.rollHistory = [];

      deleteActiveDiceSet(game, diceSet);

      await acct.save();

      res.status(200).json({
        acctId: acct._id,
        gameId: game._id,
        diceSet: diceSet
      });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 29) DELETE /accounts/:acctId/games/:gameId/die/:dieId - auth
app.delete("/accounts/:acctId/games/:gameId/diceSet/:diceSetId", auth , async (req, res) => {
  try {
      if (req.acct.acctId !== req.params.acctId) { return res.status(401).json({ error: "You cannot remove dice sets in someone else's game" }); }

      const acct = await Account.findById(req.params.acctId);

      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      const diceSet = game.diceSets.id(req.params.diceSetId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!diceSet) { return res.status(404).json({ error: "Dice Set not found" })}

      deleteActiveDiceSet(game, diceSet);
      diceSet.deleteOne();
      await acct.save();

      res.status(204).send();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* --- ROLL!! -- */
// this is really the only super fun part of the code...
// 30) POST /accounts/:acctId/games/:gameId/Roll
app.post("/accounts/:acctId/games/:gameId/Roll", auth , async (req, res) => {
  try {
      const acct = await Account.findById(req.params.acctId);
      if (!acct) { return res.status(404).json({ error: "Account not found" })}

      const game = acct.games.id(req.params.gameId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!game) { return res.status(404).json({ error: "Game not found" })}

      if (!game.activePlayerId) { return res.status(400).json({ error: "No active player" }); }
      if (!game.activeDiceSetId) { return res.status(400).json({ error: "No active dice set" }); }

      const diceSet = game.diceSets.id(game.activeDiceSetId); // already loaded in by the previous await/acct variable, so it's just an id search
      if (!diceSet) { return res.status(404).json({ error: "Active dice set not found" })}

      if(!game.activePlayerId.equals(req.body.playerId)){ return res.status(401).json({ error: "Incorrect player rolled" }) }

      game.activePlayerId = null;
      game.activeDiceSetId = null;

      let dice = diceSet.dice.map( id => game.dice.id(id.toString()));

      let outcomes = dice.map( die => {
        let t = die.frequencyDist.reduce((sum, val) => sum + val, 0);
        let roll = Math.floor(Math.random() * t);

        let i = -1;
        while(roll >= 0){
          roll -= die.frequencyDist[++i];
        }

        return die.faceValues[i];
      });

      let to_eval = diceSet.scoring;
      for(let i = outcomes.length - 1; i >= 0; i--){
        to_eval = to_eval.replaceAll(`$${i}`, JSON.stringify(outcomes[i]));
      }

      const score = new Function(to_eval)(); // run in a new Function to reduce scope so no global variables are accessed

      diceSet.rollHistory.push({
        outcomes: dice.map((die, i) => ({ id: die._id, die: die.dieName, outcome: outcomes[i]})),
        score: score
      })

      await acct.save();

      res.status(200).json({
      acctId: acct._id,
      gameId: game._id,
      score: score,
      diceSet: diceSet._id
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

async function startServer() {
  await connectDB();
  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}
startServer();