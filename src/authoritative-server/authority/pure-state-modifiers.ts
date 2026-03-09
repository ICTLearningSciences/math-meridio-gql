/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GameData, Room } from "../../schemas/models/Room";
import {
  Checking,
  ConditionalActivityStep,
  DiscussionStageStep,
  DiscussionStageStepType,
  isDiscussionStage,
  IStage,
  CollectedDiscussionData,
  CurrentStage,
  DiscussionStage,
} from "../../schemas/models/DiscussionStage/types";
import { getFirstStepId, replaceStoredDataInString } from "./helpers/helpers";
import { evaluateCondition, getGameDataCopy } from "./state-modifier-helpers";
import { GameStateData } from "../../schemas/models/Room";
import RoomModel from "../../schemas/models/Room";

/**
 * Ensures we don't overwrite the truth data, by removing any keys from the new data that are in the persist truth global state data and are set to true already.
 */
export function removePersistTruthDataFromNewData(
  gameData: GameData,
  newData: GameStateData
): GameStateData {
  const newDataWithoutPersistTruthData: GameStateData = {};
  for (const [key, value] of Object.entries(newData)) {
    const existingGameDataItem = gameData.globalStateData.gameStateData[key];
    if (
      existingGameDataItem &&
      existingGameDataItem === "true" &&
      gameData.persistTruthGlobalStateData.includes(key)
    ) {
      continue;
    }
    newDataWithoutPersistTruthData[key] = value;
  }
  return newDataWithoutPersistTruthData;
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
    for (const [_, playerData] of Object.entries(
      gameData.playersGameStateData
    )) {
      const existingPlayerGameStateData = playerData[persistTruthFieldKey];
      if (existingPlayerGameStateData) {
        playerData[persistTruthFieldKey] = globalTruthData;
      } else {
        playerData[persistTruthFieldKey] = globalTruthData;
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
    for (const [_, playerData] of Object.entries(
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
  curStage: CurrentStage<IStage>,
  step: ConditionalActivityStep,
  gameData: GameData
): string {
  const _collectedDiscussionData: CollectedDiscussionData =
    gameData.globalStateData.discussionData || {};
  const globalGameStateData: GameStateData =
    gameData.globalStateData.gameStateData;
  const collectedDiscussionData = {
    ...globalGameStateData,
    ..._collectedDiscussionData,
  };
  const hydratedConditionals = step.conditionalsToMeet.map((c) => ({
    ...c,
    expectedValue: replaceStoredDataInString(
      c.expectedValue,
      collectedDiscussionData
    ),
  }));
  let allConditionalsMet = true;
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
      if (!conditionTrue) {
        allConditionalsMet = false;
        break;
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
      if (!conditionTrue) {
        allConditionalsMet = false;
        break;
      }
    } else {
      // Checking if array or string contains value
      const conditionTrue = Array.isArray(stateValue)
        ? stateValue.find((a) => String(a) === condition.expectedValue)
        : (stateValue as string).includes(String(condition.expectedValue));
      if (!conditionTrue) {
        allConditionalsMet = false;
        break;
      }
    }
  }
  if (allConditionalsMet) {
    return step.targetStepId;
  }
  // No conditions met, get next ordered step
  const flowList = (curStage.stage as DiscussionStage).flowsList.find((flow) =>
    flow.steps.find((s) => s.stepId === step.stepId)
  );
  if (!flowList) {
    throw new Error(
      `Failed to find flow list in conditional step for stage: ${curStage.stage.clientId}`
    );
  }
  const curStepIdx = flowList.steps.findIndex((s) => s.stepId === step.stepId);
  if (curStepIdx === -1) {
    throw new Error(
      `Failed to find current step index in conditional step to go to next step: ${curStage.stage.clientId}`
    );
  }
  const nextStepIdx = curStepIdx + 1;
  if (nextStepIdx >= flowList.steps.length) {
    throw new Error(`Conditional step is last in flow, no next step to go to`);
  }
  return flowList.steps[nextStepIdx].stepId;
}

export async function updateRoomStageAndOrStep(
  room: Room,
  stageId?: string,
  stepId?: string
): Promise<Room> {
  const updateOperations: Record<string, any> = {};
  if (stageId) {
    updateOperations[`gameData.globalStateData.curStageId`] = stageId;
  }
  if (stepId) {
    updateOperations[`gameData.globalStateData.curStepId`] = stepId;
  }
  // console.log(`updateOperations: ${JSON.stringify(updateOperations, null, 2)}`);
  const updatedRoom = await RoomModel.findOneAndUpdate(
    { _id: room._id },
    { $set: updateOperations },
    { new: true }
  );
  if (!updatedRoom) {
    throw new Error(`Failed to update room: ${room._id}`);
  }
  return updatedRoom.toObject();
}

/**
 * Updates the game data with the next step.
 * IMPORTANT: This function assumes the current step is complete.
 */
export async function updateRoomWithNextStep(
  room: Room,
  curStage: CurrentStage<IStage>,
  curStep?: DiscussionStageStep
): Promise<Room> {
  const collectedDiscussionData: CollectedDiscussionData =
    room.gameData.globalStateData.discussionData || {};

  // find next step in the flow
  if (isDiscussionStage(curStage.stage)) {
    if (!curStep) {
      throw new Error("No step found for discussion stage");
    }
    if (curStep.lastStep) {
      const nextStage = curStage.getNextStage(
        collectedDiscussionData,
        room.gameData.globalStateData.gameStateData
      );
      const nextStepId = getFirstStepId(nextStage);
      return await updateRoomStageAndOrStep(
        room,
        nextStage.clientId,
        nextStepId
      );
    }

    // getNextStep

    // Handle conditional step
    if (curStep.stepType === DiscussionStageStepType.CONDITIONAL) {
      const nextStep = getNextStepFromConditionalStage(
        curStage,
        curStep as ConditionalActivityStep,
        room.gameData
      );
      if (nextStep) {
        return await updateRoomStageAndOrStep(room, undefined, nextStep);
      }
    }

    if (curStep.jumpToStepId) {
      return await updateRoomStageAndOrStep(
        room,
        undefined,
        curStep.jumpToStepId
      );
    }

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
      return await updateRoomStageAndOrStep(room, undefined, nextStep.stepId);
    }
  } else {
    // Is a simulation stage, just need to get the next stage id
    const nextStage = curStage.getNextStage(
      collectedDiscussionData,
      room.gameData.globalStateData.gameStateData
    );
    let nextStepId = nextStage.clientId;
    if (isDiscussionStage(nextStage)) {
      nextStepId = getFirstStepId(nextStage);
    }
    return await updateRoomStageAndOrStep(room, nextStage.clientId, nextStepId);
  }
}
