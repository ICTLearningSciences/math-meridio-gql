/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GameData } from "../../schemas/models/Room";
import {
  Checking,
  ConditionalActivityStep,
  DiscussionStageStep,
  DiscussionStageStepType,
  isDiscussionStage,
  IStage,
  CollectedDiscussionData,
  CurrentStage,
} from "../../schemas/models/DiscussionStage/types";
import { getFirstStepId, replaceStoredDataInString } from "./helpers/helpers";
import { evaluateCondition, getGameDataCopy } from "./state-modifier-helpers";
import { GameStateData } from "../../schemas/models/Room";

/**
 * Updates the global game state data with the new data
 */
export function updateGlobalStateData(
  _gameData: GameData,
  persistTruthFields: string[],
  newData: GameStateData
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  for (const [key, value] of Object.entries(newData)) {
    const existingGameDataItem = gameData.globalStateData.gameStateData[key];
    if (
      existingGameDataItem &&
      existingGameDataItem === "true" &&
      persistTruthFields.includes(key)
    ) {
      continue;
    }
    gameData.globalStateData.gameStateData[key] = value;
  }
  return gameData;
}

export function updateDiscussionData(
  _gameData: GameData,
  newData: GameStateData
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  const collectedDiscussionData: CollectedDiscussionData =
    gameData.globalStateData.discussionData || {};
  for (const [key, value] of Object.entries(newData)) {
    collectedDiscussionData[key] = value;
  }
  gameData.globalStateData.discussionData = collectedDiscussionData;
  return gameData;
}

/**
 * Updates the players individual game state data with the new data
 */
export function updatePlayerStateData(
  _gameData: GameData,
  persistTruthFields: string[],
  playerId: string,
  newPlayerGameStateData: GameStateData
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  for (const [key, value] of Object.entries(newPlayerGameStateData)) {
    const existingPlayerGameStateData = gameData.playersGameStateData[playerId];
    if (!existingPlayerGameStateData) {
      throw new Error(`Player data not found for player ${playerId}`);
    }
    const existingPlayerGameDataItem = existingPlayerGameStateData[key];
    if (
      existingPlayerGameDataItem &&
      existingPlayerGameDataItem.value === "true" &&
      persistTruthFields.includes(key)
    ) {
      continue;
    }
    if (existingPlayerGameDataItem) {
      existingPlayerGameDataItem.value = value;
    } else {
      existingPlayerGameStateData[key] = value;
    }
  }
  return gameData;
}

/**
 * For every field that we want to globally persist as true and is in the global state data, sync the value to the players
 * @param gameData - the game data to sync the truth data to
 * @param persistTruthFields - the fields to sync to the players
 * @returns the updated game data
 */
export function syncGlobalTruthDataToPlayers(
  _gameData: GameData,
  persistTruthFields: string[]
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  for (const persistTruthFieldKey of persistTruthFields) {
    const globalTruthData =
      gameData.globalStateData.gameStateData[persistTruthFieldKey];
    if (!globalTruthData) {
      continue;
    }
    for (const [playerId, playerData] of Object.entries(
      gameData.playersGameStateData
    )) {
      const existingPlayerGameStateData = playerData[persistTruthFieldKey];
      if (existingPlayerGameStateData) {
        existingPlayerGameStateData.value = globalTruthData.value;
      } else {
        playerData[persistTruthFieldKey] = globalTruthData.value;
      }
    }
  }
  return gameData;
}

/**
 * For every key in the global state data, sync the value to the players if the key is not already in the players game state data
 */
export function syncGlobalGameStateKeysToPlayers(
  _gameData: GameData
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  for (const [key, value] of Object.entries(
    gameData.globalStateData.gameStateData
  )) {
    for (const [playerId, playerData] of Object.entries(
      gameData.playersGameStateData
    )) {
      const existingPlayerGameStateData = playerData[key];
      if (existingPlayerGameStateData) {
        continue;
      } else {
        playerData[key] = value;
      }
    }
  }
  return gameData;
}

/**
 * Gets the ID of the next step from a conditional step, depending if conditions are met.
 * Conditionals can only jump to steps within the same stage.
 */
export function getNextStepFromConditionalStage(
  step: ConditionalActivityStep,
  gameData: GameData
): string {
  const collectedDiscussionData: CollectedDiscussionData =
    gameData.globalStateData.discussionData || {};
  const hydratedConditionals = step.conditionals.map((c) => ({
    ...c,
    expectedValue: replaceStoredDataInString(
      c.expectedValue,
      collectedDiscussionData
    ),
  }));
  for (let i = 0; i < hydratedConditionals.length; i++) {
    const condition = hydratedConditionals[i];
    let stateValue = collectedDiscussionData[condition.stateDataKey];
    if (!stateValue) {
      throw new Error(`failed to find state value ${condition.stateDataKey}`);
    }
    if (
      typeof stateValue === "string" &&
      ["false", "true", "False", "True"].includes(stateValue)
    ) {
      if (stateValue === "false" || stateValue === "False") {
        stateValue = false;
      } else {
        stateValue = true;
      }
    }

    if (condition.checking === Checking.VALUE) {
      const conditionTrue = evaluateCondition(
        stateValue,
        condition.operation,
        condition.expectedValue
      );
      if (conditionTrue) {
        return condition.targetStepId;
      }
    } else if (condition.checking === Checking.LENGTH) {
      if (!Array.isArray(stateValue) && typeof stateValue !== "string") {
        throw new Error(
          `Expected a string or array for state value ${
            condition.stateDataKey
          }, but got ${typeof stateValue}`
        );
      }
      const expression = `${stateValue.length} ${condition.operation} ${condition.expectedValue}`;
      const conditionTrue = new Function(`return ${expression};`)();
      if (conditionTrue) {
        return condition.targetStepId;
      }
    } else {
      // Checking if array or string contains value
      const conditionTrue = Array.isArray(stateValue)
        ? stateValue.find((a) => String(a) === condition.expectedValue)
        : (stateValue as string).includes(String(condition.expectedValue));
      if (conditionTrue) {
        return condition.targetStepId;
      }
    }
  }
  throw new Error("Failed to find next step id for ");
}

/**
 * Updates the game data with the next step.
 * IMPORTANT: This function assumes the current step is complete.
 */
export function updateGameDataWithNextStep(
  _gameData: GameData,
  curStage: CurrentStage<IStage>,
  curStep: DiscussionStageStep
): GameData {
  const gameData: GameData = getGameDataCopy(_gameData);
  const collectedDiscussionData: CollectedDiscussionData =
    gameData.globalStateData.discussionData || {};
  if (curStep.lastStep) {
    const nextStage = curStage.getNextStage(collectedDiscussionData);
    const nextStepId = getFirstStepId(nextStage);
    gameData.globalStateData.curStageId = nextStage.clientId;
    gameData.globalStateData.curStepId = nextStepId;
    return gameData;
  }

  // getNextStep

  // Handle conditional step
  if (curStep.stepType === DiscussionStageStepType.CONDITIONAL) {
    const nextStep = getNextStepFromConditionalStage(
      curStep as ConditionalActivityStep,
      gameData
    );
    if (nextStep) {
      gameData.globalStateData.curStepId = nextStep;
      return gameData;
    }
  }

  if (curStep.jumpToStepId) {
    gameData.globalStateData.curStepId = curStep.jumpToStepId;
    return gameData;
  }

  // find next step in the flow

  if (isDiscussionStage(curStage.stage)) {
    const currentFlowList = curStage.stage.flowsList.find((flow) =>
      flow.steps.find((step) => step.stepId === curStep.stepId)
    );

    if (!currentFlowList) {
      throw new Error(`Unable to find flow for step: ${curStep.stepId}`);
    }

    const currentStepIndex = currentFlowList.steps.findIndex(
      (step) => step.stepId === curStep.stepId
    );

    if (currentStepIndex === -1) {
      throw new Error(
        `Unable to find requested step: ${curStep.stepId} in flow ${currentFlowList.name}`
      );
    }

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex >= currentFlowList.steps.length) {
      throw new Error(
        "No next step found, maybe you forgot to add a jumpToStepId for the last step in a flow?"
      );
    } else {
      const nextStep = currentFlowList.steps[nextStepIndex];
      gameData.globalStateData.curStepId = nextStep.stepId;
      return gameData;
    }
  } else {
    // Is a simulation stage, just need to get the next stage id
    gameData.globalStateData.curStepId = curStage.getNextStage(
      collectedDiscussionData
    ).clientId;
    return gameData;
  }
}
