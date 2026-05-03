/* USED IN-CLASS SLIDES AS A TEMPLATE */

const mongoose = require("mongoose");
const dieSchema = new mongoose.Schema(
  {
    dieName: {type: String, required: true},
    faceValues: {type: [Number], required: true},
    frequencyDist: {type: [Number], required: true},
    color: {type: String, required: true},
  },
  { 
    timestamps: true, // mongoose automatically does these !!!!
    versionKey: false
  } 
);

module.exports = dieSchema; // very simple lol
