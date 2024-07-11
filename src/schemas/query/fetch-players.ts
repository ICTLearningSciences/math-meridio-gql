/*

*/

import findAll from "./find-all";
import PlayerModel, { PlayerType } from "../models/Player";

export const fetchPlayers = findAll({
  nodeType: PlayerType,
  model: PlayerModel,
});

export default fetchPlayers;
