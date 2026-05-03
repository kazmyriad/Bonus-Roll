/* USED IN-CLASS SLIDES AS A TEMPLATE */

const mongoose = require("mongoose");
const playerSchema = new mongoose.Schema(
  {
    username: {type: String, required: true }
  },
  { 
    timestamps: true, // mongoose automatically does these !!!!
    versionKey: false
  } 
);

module.exports = playerSchema; // very simple lol
