/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLString, GraphQLObjectType, GraphQLID } from "graphql";
import RoomModel, { Room, RoomPhase, RoomType } from "../../models/Room";
import PlayerModel from "../../models/Player";
import { getCurStageAndStep } from "../../../authoritative-server/authority/user-action-pure-functions";
import DiscussionStageModel from "../../models/DiscussionStage/DiscussionStage";
import {
  DiscussionStageStepType,
  RequestUserInputStageStep,
} from "../../models/DiscussionStage/types";
import {
  isRequestUserInputStepComplete,
  processStepsUntilNextRequestUserInputStep,
} from "../../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../../authoritative-server/llm-request/types";
import { buildUserMessage } from "authoritative-server/authority/state-modifier-helpers";
import { verifyProcessingLock } from "../../../authoritative-server/authority/helpers/helpers";

export const sendMessageToGameRoom = {
  type: RoomType,
  args: {
    roomId: { type: GraphQLID },
    sessionId: { type: GraphQLString },
    message: { type: GraphQLString },
  },
  resolve: async (
    _root: GraphQLObjectType,
    args: {
      roomId: string;
      sessionId: string;
      message: string;
    },
    context: { userId: string }
  ): Promise<Room> => {
    const _room = await RoomModel.findOne({
      _id: args.roomId,
      deletedRoom: false,
    });
    if (!_room) throw new Error("Failed to find room");
    const player = await PlayerModel.findOne({ _id: context.userId });
    if (!player) throw new Error("Unauthorized User");
    if (!_room.gameData.players.includes(context.userId)) {
      throw new Error("User is not a player in the room");
    }
    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());
    let room: Room = _room.toObject();
    const stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

    const shouldUpdateDiscussionData =
      stageAndStep.curStep.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT &&
      stageAndStep.curStep.saveResponseVariableName;

    const updatedRoom = await RoomModel.findOneAndUpdate(
      { _id: args.roomId },
      {
        $inc: {
          versionNumber: 1,
        },
        $push: {
          "gameData.chat": buildUserMessage(
            args.message,
            context.userId,
            player.name,
            args.sessionId
          ),
        },
        ...(shouldUpdateDiscussionData
          ? {
              $set: {
                [`gameData.globalStateData.discussionData.${
                  (stageAndStep.curStep as RequestUserInputStageStep)
                    .saveResponseVariableName
                }`]: args.message,
              },
            }
          : {}),
      },
      { new: true }
    );
    room = updatedRoom.toObject();

    if (
      stageAndStep.curStep.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT &&
      room.phase !== RoomPhase.PROCESSING
    ) {
      // Try to acquire the processing lock
      const lockResult = await verifyProcessingLock(
        args.roomId,
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
      if (isRequestUserInputStepComplete(room.gameData, stageAndStep.curStep)) {
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
          args.sessionId
        );
        return await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
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
        "we are not in a request user input step, returning room with just new messages added, no processing needed."
      );
      return room;
    }
  },
};

export default sendMessageToGameRoom;
