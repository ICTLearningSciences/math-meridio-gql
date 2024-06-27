/*

*/

import RoomModel, { Room, RoomType } from "../models/Room";

export const createNewRoom = {
  type: RoomType,
  args: {},
  resolve: async (): Promise<Room> => {
    return await RoomModel.create({});
  },
};

export default createNewRoom;
