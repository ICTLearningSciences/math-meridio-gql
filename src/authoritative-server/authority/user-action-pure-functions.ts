/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  DiscussionStage,
  DiscussionStageStep,
  DiscussionStageStepType,
} from "../../schemas/models/DiscussionStage/types";
import { RoomActionType } from "../llm-request/types";
import { PlayerDocument } from "../../schemas/models/Player";
import {
  syncGlobalGameStateKeysToPlayers,
  syncGlobalTruthDataToPlayers,
  updateGlobalStateData,
  updatePlayerStateData,
} from "./pure-state-modifiers";
import {
  addUserMessageToChat,
  getGameDataCopy,
} from "./state-modifier-helpers";
import PlayerModel from "../../schemas/models/Player";
import { RoomActionQueueDocument } from "../../schemas/models/RoomActionQueue";
import { GameData, GameStateData } from "../../schemas/models/Room";

/**
 * Adds message to the chat log, records the players response for the step, updates global state data with the users response (if saveResponseAsVariableName exists), syncs all players with the global state truths.
 */
export function processPlayerSentMessageAction(
  _gameData: GameData,
  curStep: DiscussionStageStep,
  curAction: RoomActionQueueDocument,
  sendingPlayer: PlayerDocument,
  sessionId: string
): GameData {
  let gameData: GameData = getGameDataCopy(_gameData);
  const incomingMessage = curAction.payload;
  if (curAction.actionType !== RoomActionType.SEND_MESSAGE) {
    throw new Error(`Invalid action type: ${curAction.actionType}`);
  }
  gameData = addUserMessageToChat(
    gameData,
    curStep,
    incomingMessage,
    sendingPlayer._id,
    sendingPlayer.name,
    sessionId
  );
  if (
    curStep.stepType === DiscussionStageStepType.REQUEST_USER_INPUT &&
    curStep.saveResponseVariableName
  ) {
    // TECH DEBT: right now we are saving everyones responses into global state, meaning each message overwrites the previous (for the current saveResponseVariableName)
    gameData = updateGlobalStateData(
      gameData,
      gameData.persistTruthGlobalStateData,
      [
        {
          key: curStep.saveResponseVariableName,
          value: incomingMessage,
        },
      ]
    );
    gameData = updatePlayerStateData(
      gameData,
      gameData.persistTruthGlobalStateData,
      sendingPlayer._id,
      [
        {
          key: curStep.saveResponseVariableName,
          value: incomingMessage,
        },
      ]
    );
    gameData = syncGlobalTruthDataToPlayers(
      gameData,
      gameData.persistTruthGlobalStateData
    );
    gameData = syncGlobalGameStateKeysToPlayers(gameData);
  }
  return gameData;
}

/**
 * Removes the player from the room.
 * NOTE: Whatever function calls this should check if we are in a requestUserInput step and double check if we need to progress now that someone has left the room!!
 */
export function processPlayerLeavesRoomAction(
  _gameData: GameData,
  curAction: RoomActionQueueDocument
): GameData {
  if (curAction.actionType !== RoomActionType.LEAVE_ROOM) {
    throw new Error(
      "Incorrect action type provided to processPlayerLeavesRoom"
    );
  }
  const gameData: GameData = getGameDataCopy(_gameData);
  gameData.players = gameData.players.filter(
    (player) => player !== curAction.playerId
  );
  gameData.playerStateData = gameData.playerStateData.filter(
    (playerData) => playerData.player !== curAction.playerId
  );
  // TODO: we need to check if we need to progress a requestUserInput step in case we were waiting for this users response.
  return gameData;
}

export function addPlayerToRoom(
  _gameData: GameData,
  playerToAdd: PlayerDocument
) {
  const gameData = getGameDataCopy(_gameData);
  const alreadyInRoom = gameData.players.find((p) => p === playerToAdd._id);
  if (alreadyInRoom) {
    console.log("Player already in room");
    return gameData;
  }

  gameData.players.push(playerToAdd._id);

  gameData.playerStateData.push({
    player: playerToAdd._id,
    animation: "",
    gameStateData: gameData.globalStateData.gameStateData,
  });

  return gameData;
}

export function processActionUpdatePlayerStateDataAction(
  _gameData: GameData,
  action: RoomActionQueueDocument
): GameData {
  if (action.actionType !== RoomActionType.UPDATE_ROOM) {
    throw new Error(
      "Incorrect action type provided to processActionUpdatePlayerStateDataAction"
    );
  }
  let gameData = getGameDataCopy(_gameData);
  const newPlayerData: GameStateData[] = JSON.parse(action.payload);
  gameData = updatePlayerStateData(
    gameData,
    gameData.persistTruthGlobalStateData,
    action.playerId,
    newPlayerData
  );
  return gameData;
}

export function getCurStageAndStep(
  gameData: GameData,
  discussionStages: DiscussionStage[]
): {
  curStage: DiscussionStage;
  curStep: DiscussionStageStep;
} {
  const curStage = discussionStages.find(
    (stage) => stage.clientId === gameData.globalStateData.curStageId
  );
  if (!curStage) {
    throw new Error("No stage found");
  }
  const curFlow = curStage.flowsList.find((flow) =>
    flow.steps.find(
      (step) => step.stepId === gameData.globalStateData.curStepId
    )
  );
  if (!curFlow) {
    throw new Error("No flow found");
  }
  const curStep = curFlow.steps.find(
    (step) => step.stepId === gameData.globalStateData.curStepId
  );
  if (!curStep) {
    throw new Error("No step found in flow");
  }
  return {
    curStage,
    curStep,
  };
}

export async function processActions(
  _gameData: GameData,
  discussionStages: DiscussionStage[],
  actionsToProcess: RoomActionQueueDocument[],
  setResponsePending: (pending: boolean) => void,
  player: PlayerDocument,
  sessionId: string
): Promise<GameData> {
  let gameData = getGameDataCopy(_gameData);
  for (const action of actionsToProcess) {
    console.log("processing action", action);
    switch (action.actionType) {
      case RoomActionType.SEND_MESSAGE: {
        setResponsePending(true);
        const { curStep } = getCurStageAndStep(gameData, discussionStages);
        gameData = processPlayerSentMessageAction(
          gameData,
          curStep,
          action,
          player,
          sessionId
        );
        setResponsePending(false);
        break;
      }
      case RoomActionType.LEAVE_ROOM:
        gameData = processPlayerLeavesRoomAction(gameData, action);
        break;
      case RoomActionType.JOIN_ROOM: {
        const requestingPlayer = await PlayerModel.findById(action.playerId);
        gameData = addPlayerToRoom(gameData, requestingPlayer);
        break;
      }
      case RoomActionType.UPDATE_ROOM:
        gameData = processActionUpdatePlayerStateDataAction(gameData, action);
        break;
      default:
        throw new Error(`Unknown action type: ${action.actionType}`);
    }
  }
  return gameData;
}
