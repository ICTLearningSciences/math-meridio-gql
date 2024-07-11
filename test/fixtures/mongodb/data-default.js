/*

*/

import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

module.exports = {
  players: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      clientId: "1",
      name: "Jonny Appleseed",
      avatar: "man_apple_head",
      description: "I want an avatar with an apple for a head",
    },
  ],

  rooms: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      users: ["5f748650f4b3f1b9f1f1f1f2", "5f748650f4b3f1b9f1f1f1f3"],
    },
  ],
};
