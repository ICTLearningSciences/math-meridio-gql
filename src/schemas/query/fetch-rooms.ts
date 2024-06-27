/*

*/

import findAll from "./find-all";
import RoomModel, { RoomType } from "../models/Room";

export const fetchRooms = findAll({
  nodeType: RoomType,
  model: RoomModel,
});

export default fetchRooms;
