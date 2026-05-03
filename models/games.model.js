/* USED IN-CLASS SLIDES AS A TEMPLATE */

const playerSchema = require("./players.model");
const dieSchema = require("./dice.model");
const diceSetSchema = require("./diceSets.model");

const mongoose = require("mongoose");
const gameSchema = new mongoose.Schema(
  {
    name: {type: String, required: true },
    game: {type: String, required: true },
    activePlayerId: {type: mongoose.Schema.Types.ObjectId, default: null },
    activeDiceSetId: {type: mongoose.Schema.Types.ObjectId, default: null },
    players: {type: [playerSchema], default: [] },
    dice: {type: [dieSchema], default: [] },
    diceSets: {type: [diceSetSchema], default: [] },
  },
  { 
    timestamps: true, // mongoose automatically does these !!!!
    versionKey: false
  } 
);

module.exports = gameSchema;
