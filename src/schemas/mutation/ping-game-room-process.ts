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
  EndOfPhaseReflectionStep,
  RequestUserInputStageStep,
} from "../../schemas/models/DiscussionStage/types";
import { DiscussionStageStepType } from "../../schemas/models/DiscussionStage/types";
import {
  acquireProcessingLock,
  updateRoomPlayerStatusedRecord,
} from "../../authoritative-server/authority/helpers/helpers";
import {
  requestUserInputStageStatus as _isRequestUserInputStepComplete,
  isSimulationStageComplete as _isSimulationStageComplete,
  endOfPhaseReflectionStepStatus as _endOfPhaseReflectionStepStatus,
  transitionToEndOfPhaseReflectionState,
} from "../../authoritative-server/authority/step-process-pure-functions";
import { processStepsUntilNextStallingPhase } from "../../authoritative-server/authority/step-process-pure-functions";
import { AiServiceNames } from "../../authoritative-server/llm-request/types";
import DiscussionStageModel from "../../schemas/models/DiscussionStage/DiscussionStage";
import GamePhaseReflectionsModel, {
  GamePhaseReflections,
} from "../../schemas/models/GamePhaseReflections";
import { getCurStageAndStep } from "../../authoritative-server/authority/user-action-pure-functions";
import { WAIT_FOR_SIMULATION_STAGE_CLIENT_ID } from "../../authoritative-server/games/game-helpers";
import { PlayerComputedState } from "../../schemas/types/types";
import { EducationalRole } from "../../schemas/models/Player";
import { updatePlayersHeartbeat } from "../../authoritative-server/authority/step-process-pure-functions";
import { getStartingPhasesInOrderForGame } from "../../helpers";

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
    },
    context: {
      userId: string;
      userEducationalRole: EducationalRole;
    }
  ): Promise<Room> => {
    const { roomId, sessionId } = args;
    let room = await updatePlayersHeartbeat(roomId, context.userId);
    if (room.gameData.players.length === 0) {
      console.log("no players in room, returning room as is");
      return room;
    }
    room = await updateRoomPlayerStatusedRecord(
      room,
      context.userId,
      RoomModel
    );
    const activePlayers = Object.values(
      room.gameData.playersStatusRecord
    ).filter(
      (playerStatus) =>
        playerStatus.computedState === PlayerComputedState.ACTIVE
    );
    if (activePlayers.length === 0) {
      console.log("no active players in room, returning room as is");
      return room;
    }
    if (!room.gameData.gameId) {
      console.log("no gameId selected for room, returning room as is");
      return room;
    }

    const _discussionStages = await DiscussionStageModel.find();
    const discussionStages = _discussionStages.map((stage) => stage.toObject());

    if (
      !room.gameData.phaseProgression.startingPhaseStepsOrdered.length &&
      room.gameData.gameId
    ) {
      const startingPhases = getStartingPhasesInOrderForGame(
        room.gameData.gameId,
        discussionStages
      );
      room = (
        await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              "gameData.phaseProgression.startingPhaseStepsOrdered":
                startingPhases,
            },
          },
          { new: true }
        )
      ).toObject();
    }

    const _roomGamePhaseReflections = await GamePhaseReflectionsModel.find({
      roomId: roomId,
    });
    const roomGamePhaseReflections: GamePhaseReflections[] =
      _roomGamePhaseReflections?.map((reflection) => reflection.toObject()) ||
      [];
    let curRoundGamePhaseReflection = roomGamePhaseReflections.find(
      (reflection) =>
        reflection.roundNumber === room.gameData.curGameState.curRoundNumber
    );
    let stageAndStep = getCurStageAndStep(room.gameData, discussionStages);

    let isDiscussionStage = _isDiscussionStage(stageAndStep.curStage);
    let isRequestUserInputStep =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT;
    let requestUserInputStageStatus =
      isRequestUserInputStep &&
      _isRequestUserInputStepComplete(
        room.gameData,
        stageAndStep.curStep as RequestUserInputStageStep
      );
    let isSimulationStage =
      stageAndStep.curStage.clientId === WAIT_FOR_SIMULATION_STAGE_CLIENT_ID;
    let isSimulationStageComplete =
      isSimulationStage && _isSimulationStageComplete(room.gameData);
    let roomIsProcessing = room.phase === RoomPhase.PROCESSING;

    let isEndOfPhaseReflectionStep =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.END_OF_PHASE_REFLECTION &&
      room.gameData.curGameState.curState === "END_OF_PHASE_REFLECTION";
    let endOfPhaseReflectionStepStatus =
      isEndOfPhaseReflectionStep &&
      _endOfPhaseReflectionStepStatus(room, curRoundGamePhaseReflection);

    const isWaitingForEndOfPhaseReflectionReadyUp =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.END_OF_PHASE_REFLECTION &&
      room.gameData.curGameState.curState ===
        "WAITING_FOR_STUDENT_READY_TO_CONTINUE";
    const isEndOfPhaseReflectionReadyUpComplete = Boolean(
      room.gameData.curGameState.studentReadyToContinue
    );

    const isCompleteRequestUserInputStep =
      isDiscussionStage &&
      isRequestUserInputStep &&
      requestUserInputStageStatus.isComplete;
    const isCompleteSimulationStage =
      isSimulationStage && isSimulationStageComplete;
    const isCompleteEndOfPhaseReflectionStep =
      isEndOfPhaseReflectionStep && endOfPhaseReflectionStepStatus.isComplete;
    const isCompleteEndOfPhaseReflectionReadyUp =
      isWaitingForEndOfPhaseReflectionReadyUp &&
      isEndOfPhaseReflectionReadyUpComplete;

    console.log("-------------------------------- FIRST CHECKING VARS -----");
    console.log(
      "isCompleteRequestUserInputStep",
      isCompleteRequestUserInputStep
    );
    console.log("isCompleteSimulationStage", isCompleteSimulationStage);
    console.log(
      "isCompleteEndOfPhaseReflectionStep",
      isCompleteEndOfPhaseReflectionStep
    );
    console.log(
      "isCompleteEndOfPhaseReflectionReadyUp",
      isCompleteEndOfPhaseReflectionReadyUp
    );
    console.log("roomIsProcessing", roomIsProcessing);
    console.log("-------------------------------- FIRST CHECKING VARS -----");

    // Transition from end of phase reflection step to waiting for student ready to continue
    if (isCompleteEndOfPhaseReflectionStep) {
      console.log(
        "Transitioning to WAITING_FOR_STUDENT_READY_TO_CONTINUE state"
      );
      room = await RoomModel.findOneAndUpdate(
        { _id: args.roomId },
        {
          $set: {
            "gameData.curGameState.curState":
              "WAITING_FOR_STUDENT_READY_TO_CONTINUE",
            "gameData.curGameState.studentReadyToContinue": false,
            "gameData.curGameState.studentReflections":
              endOfPhaseReflectionStepStatus.studentReflections,
          },
        },
        { new: true }
      );
    } else if (
      (isCompleteRequestUserInputStep ||
        isCompleteSimulationStage ||
        isCompleteEndOfPhaseReflectionReadyUp) &&
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
      room = await processStepsUntilNextStallingPhase(
        room,
        discussionStages,
        {
          serviceName: AiServiceNames.OPEN_AI,
          model: "gpt-4o-mini",
        },
        room.gameData.globalStateData.roomOwnerId,
        sessionId
      );
      room = await RoomModel.findOneAndUpdate(
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

    // After all processing (or none), re-check the rooms state and see if we need to update the rooms curGameState
    stageAndStep = getCurStageAndStep(room.gameData, discussionStages);
    isDiscussionStage = _isDiscussionStage(stageAndStep.curStage);
    isRequestUserInputStep =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.REQUEST_USER_INPUT;
    requestUserInputStageStatus =
      isRequestUserInputStep &&
      _isRequestUserInputStepComplete(
        room.gameData,
        stageAndStep.curStep as RequestUserInputStageStep
      );
    isSimulationStage =
      stageAndStep.curStage.clientId === WAIT_FOR_SIMULATION_STAGE_CLIENT_ID;
    isSimulationStageComplete =
      isSimulationStage && _isSimulationStageComplete(room.gameData);
    roomIsProcessing = room.phase === RoomPhase.PROCESSING;

    isEndOfPhaseReflectionStep =
      isDiscussionStage &&
      stageAndStep.curStep?.stepType ===
        DiscussionStageStepType.END_OF_PHASE_REFLECTION;
    endOfPhaseReflectionStepStatus =
      isEndOfPhaseReflectionStep &&
      _endOfPhaseReflectionStepStatus(room, curRoundGamePhaseReflection);
    curRoundGamePhaseReflection = roomGamePhaseReflections.find(
      (reflection) =>
        reflection.roundNumber === room.gameData.curGameState.curRoundNumber
    );

    console.log("----- RECHECKING VARS -----");
    console.log("isDiscussionStage", isDiscussionStage);
    console.log("isRequestUserInputStep", isRequestUserInputStep);
    console.log("requestUserInputStageStatus", requestUserInputStageStatus);
    console.log("isSimulationStage", isSimulationStage);
    console.log("isSimulationStageComplete", isSimulationStageComplete);
    console.log("isEndOfPhaseReflectionStep", isEndOfPhaseReflectionStep);
    console.log(
      "endOfPhaseReflectionStepStatus",
      endOfPhaseReflectionStepStatus
    );
    console.log("roomIsProcessing", roomIsProcessing);
    console.log("----- RECHECKING VARS -----");

    // if we are now in a request user input step and it is not complete, check the status of the request user input step.
    if (isRequestUserInputStep && !requestUserInputStageStatus.isComplete) {
      const newGameState = (stageAndStep.curStep as RequestUserInputStageStep)
        .requireInputType;

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

    // if we are now in a game phase reflection state and it is not complete, check and update the status of the request user input step
    if (
      isEndOfPhaseReflectionStep &&
      !endOfPhaseReflectionStepStatus.isComplete &&
      room.gameData.curGameState.curState !==
        "WAITING_FOR_STUDENT_READY_TO_CONTINUE"
    ) {
      console.log("incomplete end of phase reflection step, checking status");
      const curStepGamePhaseReflections = roomGamePhaseReflections.filter(
        (reflection) => reflection.stepId === stageAndStep.curStep.stepId
      );
      if (room.gameData.curGameState.curState !== "END_OF_PHASE_REFLECTION") {
        console.log("transitioning to end of phase reflection state");
        room = await transitionToEndOfPhaseReflectionState(
          room,
          stageAndStep.curStep as EndOfPhaseReflectionStep,
          curStepGamePhaseReflections
        );
      } else {
        // We are in an incomplete end of phase reflection step, so we need to apply the endOfPhaseReflectionStepStatus to the room.
        console.log("applying endOfPhaseReflectionStepStatus to room");
        room = await RoomModel.findOneAndUpdate(
          { _id: args.roomId },
          {
            $set: {
              "gameData.curGameState.curState": "END_OF_PHASE_REFLECTION",
              "gameData.curGameState.playersLeftToRespond":
                endOfPhaseReflectionStepStatus.playersLeftToRespond,
              "gameData.curGameState.studentReflections":
                endOfPhaseReflectionStepStatus.studentReflections,
            },
          },
          { new: true }
        );
      }
    }
    return room;
  },
};

export default pingGameRoomProcess;
