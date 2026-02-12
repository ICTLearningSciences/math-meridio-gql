/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import {
  DiscussionStage,
  DiscussionStageStep,
} from "../../schemas/models/DiscussionStage/types";
import { PlayerDocument } from "../../schemas/models/Player";
import { getGameDataCopy } from "./state-modifier-helpers";
import { GameData } from "../../schemas/models/Room";

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

  gameData.playersGameStateData[playerToAdd._id] =
    gameData.globalStateData.gameStateData || {};

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
