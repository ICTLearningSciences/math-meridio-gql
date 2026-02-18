/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { GraphQLObjectType, GraphQLString } from "graphql";
import { Room, RoomPhase, RoomType } from "../models/Room";
import RoomModel from "../../schemas/models/Room";
import {
  isDiscussionStage as _isDiscussionStage,
  RequestUserInputStageStep,
} from "../../schemas/models/DiscussionStage/types";
import { DiscussionStageStepType } from "../../schemas/models/DiscussionStage/types";
import { acquireProcessingLock } from "../../authoritative-server/authority/helpers/helpers";
import {
  requestUserInputStageStatus as _isRequestUserInputStepComplete,
  isSimulationStageComplete as _isSimulationStageComplete,
} from "../../authoritative-server/authority/step-process-pure-functions";
import { processStepsUntilNextRequestUserInputStep } from "../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../authoritative-server/llm-request/types";
import DiscussionStageModel from "../../schemas/models/DiscussionStage/DiscussionStage";
import { getCurStageAndStep } from "../../authoritative-server/authority/user-action-pure-functions";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "../../authoritative-server/games/game-helpers";

export const pingGameRoomProcess = {
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
    }
  ): Promise<Room> => {
    const { roomId, sessionId } = args;
    const _room = await RoomModel.findOne({ _id: roomId, deletedRoom: false });
    if (!_room) {
      throw new Error("Room not found");
    }

    let room: Room = _room.toObject();
    if (room.gameData.players.length === 0) {
      console.log("no players in room, returning room as is");
      return room;
    }
    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());
    const stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

    const isDiscussionStage = _isDiscussionStage(stageAndStep.curStage);
    const isRequestUserInputStep =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT;
    const requestUserInputStageStatus =
      isRequestUserInputStep &&
      _isRequestUserInputStepComplete(
        room.gameData,
        stageAndStep.curStep as RequestUserInputStageStep
      );
    const isSimulationStage =
      stageAndStep.curStage.clientId === WAIT_FOR_SIMULATION_STAGE_CLIENT_ID;
    const isSimulationStageComplete =
      isSimulationStage && _isSimulationStageComplete(room.gameData);
    const roomIsProcessing = room.phase === RoomPhase.PROCESSING;

    console.log("isDiscussionStage", isDiscussionStage);
    console.log("isRequestUserInputStep", isRequestUserInputStep);
    console.log("requestUserInputStageStatus", requestUserInputStageStatus);
    console.log("isSimulationStage", isSimulationStage);
    console.log("isSimulationStageComplete", isSimulationStageComplete);
    console.log("roomIsProcessing", roomIsProcessing);

    if (
      ((isDiscussionStage &&
        isRequestUserInputStep &&
        requestUserInputStageStatus.isComplete) ||
        (isSimulationStage && isSimulationStageComplete)) &&
      !roomIsProcessing
    ) {
      const lockResult = await acquireProcessingLock(
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
      room = lockResult.room;

      // check if we are ready to move on from the current step and continue processing.
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
        room.gameData.globalStateData.roomOwnerId,
        sessionId
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
    }
    console.log("No complete step found, no processing required.");

    // Update the rooms state with players left to respond with is a request user input step.
    if (isRequestUserInputStep && !requestUserInputStageStatus.isComplete) {
      const newGameState = (stageAndStep.curStep as RequestUserInputStageStep)
        .requireInputType;

      const curRoomState = _isRequestUserInputStepComplete(
        room.gameData,
        stageAndStep.curStep as RequestUserInputStageStep
      );

      room = await RoomModel.findOneAndUpdate(
        { _id: args.roomId },
        {
          $set: {
            "gameData.curGameState": {
              curState: newGameState,
              playersLeftToRespond:
                requestUserInputStageStatus.playersLeftToRespond || [],
            },
          },
        },
        { new: true }
      );
    }

    return room;
  },
};

export default pingGameRoomProcess;
