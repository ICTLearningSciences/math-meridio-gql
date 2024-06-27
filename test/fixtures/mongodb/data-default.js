/*

*/

import mongoose from "mongoose";
const { ObjectId } = mongoose.Types;

module.exports = {
  rooms: [
    {
      _id: new ObjectId("5f748650f4b3f1b9f1f1f1f1"),
      users: ["5f748650f4b3f1b9f1f1f1f2", "5f748650f4b3f1b9f1f1f1f3"],
    },
  ],
};
