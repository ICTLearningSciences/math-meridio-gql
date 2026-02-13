/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { Room, RoomPhase, RoomType } from "../models/Room";
import RoomModel from "schemas/models/Room";
import PlayerModel from "schemas/models/Player";
import {
  addPlayerToRoom,
  isRequestUserInputStepComplete,
  processStepsUntilNextRequestUserInputStep,
} from "authoritative-server/authority/step-process-pure-functions";
import { getCurStageAndStep } from "authoritative-server/authority/user-action-pure-functions";
import DiscussionStageModel from "schemas/models/DiscussionStage/DiscussionStage";
import {
  DiscussionStageStepType,
  isDiscussionStage,
} from "schemas/models/DiscussionStage/types";
import { acquireProcessingLock } from "authoritative-server/authority/helpers/helpers";
import { AiServiceNames } from "authoritative-server/llm-request/types";

export const leaveGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLString },
    sessionId: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      sessionId: string;
    },
    context: {
      userId: string;
    }
  ): Promise<Room> => {
    try {
      const userId = context.userId;
      const { roomId, sessionId } = args;

      const player = await PlayerModel.findOne({ _id: userId });
      if (!player) {
        throw new Error("User Not Found");
      }

      const _room = await RoomModel.findOne({
        _id: roomId,
        deletedRoom: false,
      });
      if (!_room) {
        throw new Error("Room not found");
      }

      if (!_room.gameData.players.includes(player._id)) {
        console.log("player not in room");
        return _room;
      }

      const roomWithoutUser = await RoomModel.findOneAndUpdate(
        { _id: _room._id },
        { $pull: { "gameData.players": player._id } },
        { new: true }
      );

      let room: Room = roomWithoutUser.toObject();

      const _discussionStages = await DiscussionStageModel.find();
      const discussionStages = _discussionStages.map((stage) =>
        stage.toObject()
      );
      const stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

      // Now with the user removed, we need to check if we need to process steps again in case they were the last person that needed to provide input.
      if (
        isDiscussionStage(stageAndStep.curStage) &&
        stageAndStep.curStep.stepType ===
          DiscussionStageStepType.REQUEST_USER_INPUT &&
        room.phase !== RoomPhase.PROCESSING
      ) {
        // Try to acquire the processing lock
        const lockResult = await acquireProcessingLock(
          roomId,
          room.versionNumber,
          RoomModel
        );

        if (!lockResult.success) {
          console.log(
            `Failed to acquire processing lock: ${lockResult.reason}. Returning room with just new messages added.`
          );
          return lockResult.room || room;
        }

        // We have the processing lock CONFIRMED, we can now process the step.
        room = lockResult.room;
        console.log("we are in a request user input step");

        // check if we are ready to move on from an input step and continue processing.
        if (
          isRequestUserInputStepComplete(room.gameData, stageAndStep.curStep)
        ) {
          console.log(
            "we are ready to move on from an input step and continue processing."
          );
          room = await processStepsUntilNextRequestUserInputStep(
            room,
            discussionStages,
            {
              serviceName: AiServiceNames.OPEN_AI,
              model: "gpt-4o-mini",
            },
            context.userId,
            sessionId
          );
          return await RoomModel.findOneAndUpdate(
            { _id: roomId },
            {
              $set: {
                gameData: room.gameData,
                phase: RoomPhase.NO_ACTIVE_PROCESSING,
              },
              $inc: {
                versionNumber: 1,
              },
            },
            { new: true }
          );
        } else {
          console.log(
            "we are not ready to move on from an input step, no processing occured"
          );
          return room;
        }
      } else {
        console.log(
          "we are not in a request user input step, returning room with the user removed, no extra processing needed."
        );
        return room;
      }
    } catch (error) {
      throw new Error(error);
    }
  },
};

export default leaveGameRoom;
