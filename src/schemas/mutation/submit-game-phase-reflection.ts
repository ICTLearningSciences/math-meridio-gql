/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLID, GraphQLString, GraphQLObjectType } from "graphql";
import RoomModel from "../models/Room";
import GamePhaseReflectionsModel, {
  GamePhaseReflections,
  GamePhaseReflectionsType,
} from "../../schemas/models/GamePhaseReflections";
import NotificationEventModel, {
  NotificationType,
} from "../models/NotificationEvent";
import PlayerModel from "../models/Player";

export const submitGamePhaseReflection = {
  type: GamePhaseReflectionsType,
  args: {
    roomId: { type: GraphQLID },
    reflection: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: { reflection: string; roomId: string },
    context: {
      userId: string;
    }
  ): Promise<GamePhaseReflections> => {
    const room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!room) throw new Error("Invalid room");

    const roomIsInGamePhaseReflection =
      room.gameData.curGameState.curState === "END_OF_PHASE_REFLECTION" ||
      room.gameData.curGameState.curState ===
        "WAITING_FOR_STUDENT_READY_TO_CONTINUE";

    if (!roomIsInGamePhaseReflection)
      throw new Error("Room is not in game phase reflection");

    const phaseNumber = room.gameData.phaseProgression.phasesStarted.length - 1;
    let phaseId = "";
    if (room.gameData.phaseProgression.phasesStarted?.length > 0) {
      phaseId =
        room.gameData.phaseProgression.phasesStarted[
          room.gameData.phaseProgression.phasesStarted.length - 1
        ];
    }
    const phase = await GamePhaseReflectionsModel.findOneAndUpdate(
      {
        roomId: args.roomId,
        stepId: room.gameData.globalStateData.curStepId,
        roundNumber: room.gameData.curGameState.curRoundNumber,
      },
      {
        $set: {
          [`reflections.${context.userId}`]: args.reflection,
          phaseId,
        },
      },
      {
        new: true,
      }
    );

    const player = await PlayerModel.findOne({ _id: context.userId });
    await NotificationEventModel.create({
      roomId: args.roomId,
      userId: context.userId,
      event: `${player?.name || "Player"} in room ${
        room?.name
      } has submitted their reflection for phase ${phaseNumber}`,
      eventType: NotificationType.NONE,
      eventAt: new Date(),
    });

    if (!phase) throw new Error("Failed to find game phase reflection");
    return phase;
  },
};

export default submitGamePhaseReflection;
