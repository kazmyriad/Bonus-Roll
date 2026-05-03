/* USED IN-CLASS SLIDES AS A TEMPLATE */

const mongoose = require("mongoose");
const diceSetSchema = new mongoose.Schema(
  {
    diceSetName: {type: String, required: true},
    dice: {type: [mongoose.Schema.Types.ObjectId], required: true},
    scoring: {type: String, required: true},
    rollHistory: {type: [], default: []},
  },
  { 
    timestamps: true, // mongoose automatically does these !!!!
    versionKey: false
  } 
);

module.exports = diceSetSchema; // very simple lol
