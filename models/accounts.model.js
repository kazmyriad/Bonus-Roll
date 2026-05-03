/* USED IN-CLASS SLIDES AS A TEMPLATE */

const gameSchema = require("./games.model");

const mongoose = require("mongoose");
const acctSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },

    hashed_password: { type: String, required: true},

    games: {type: [gameSchema], default: []}
  },
  { 
    timestamps: true, // mongoose automatically does these !!!!
    versionKey: false
  } 
);

const Account = mongoose.model("Account", acctSchema);
module.exports = Account;
