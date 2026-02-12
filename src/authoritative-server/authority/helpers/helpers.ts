/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import { JsonResponseData } from "../../../authoritative-server/llm-request/types";
import {
  CollectedDiscussionData,
  DiscussionStage,
  isDiscussionStage,
  IStage,
} from "../../../schemas/models/DiscussionStage/types";
import { Schema, Validator } from "jsonschema";
import {
  ChatMessage,
  GameStateData,
  Room,
  RoomPhase,
  RoomModel as RoomModelType,
} from "../../../schemas/models/Room";

export function replaceStoredDataInString(
  str: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateData: Record<string, any>
): string {
  try {
    // replace all instances of {{key.data...}} in str with stored data[key][data...]
    const regex = /{{(.*?)}}/g;
    return str.trim().replace(regex, (match, key) => {
      const keys = key.split(".");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = keys.reduce((acc: Record<string, any>, k: string) => {
        return acc[k];
      }, stateData);
      return value || "";
    });
  } catch (e) {
    console.error(e);
    return str;
  }
}

export function getFirstStepId(stage: IStage): string {
  if (isDiscussionStage(stage)) {
    return (stage as DiscussionStage).flowsList[0].steps[0].stepId;
  }
  return stage.clientId;
}

export function recursiveUpdateAdditionalInfo(
  data: JsonResponseData[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stateData: Record<string, any>
) {
  const copy: JsonResponseData[] = JSON.parse(JSON.stringify(data));
  for (const item of copy) {
    if (item.additionalInfo) {
      item.additionalInfo = replaceStoredDataInString(
        item.additionalInfo,
        stateData
      );
    }
    if (item.subData) {
      item.subData = recursiveUpdateAdditionalInfo(item.subData, stateData);
    }
  }
  return copy;
}

// recursively convert expected data into a prompt string
export function recursivelyConvertExpectedDataToAiPromptString(
  expectedData: JsonResponseData[]
): string {
  let promptString = `Respond in JSON. Validate that your response is valid JSON. Your JSON must follow this format:\n`;
  promptString += `{\n`;

  function buildSchema(data: JsonResponseData[], indent: string): string {
    let schema = "";
    data.forEach((item, index) => {
      schema += `${indent}"${item.name}": `;
      if (item.type === "object" && item.subData) {
        schema += `{${
          item.additionalInfo ? `\t// ${item.additionalInfo}` : ""
        }\n`;
        schema += buildSchema(item.subData, `${indent}  `);
        schema += `${indent}}\n`;
      } else {
        schema += `"${item.type}"`;
        if (item.additionalInfo) {
          schema += `\t// ${item.additionalInfo}`;
        }
      }
      if (index < data.length - 1) {
        schema += ",";
      }
      schema += "\n";
    });
    return schema;
  }

  promptString += buildSchema(expectedData, "  ");
  promptString += `}\n`;

  return promptString;
}

function convertExpectedDataIntoSchema(
  expectedData: JsonResponseData[]
): Schema {
  const schema: Schema = {
    type: "object",
    properties: {},
    required: [],
  };
  for (const expectedField of expectedData) {
    schema.properties[expectedField.name] = {
      type: expectedField.type,
    };
    if (expectedField.isRequired) {
      (schema.required as string[]).push(expectedField.name);
    }
  }
  return schema;
}

export function receivedExpectedData(
  expectedData: JsonResponseData[],
  jsonResponse: string
) {
  try {
    const v = new Validator();
    const schema = convertExpectedDataIntoSchema(expectedData);
    const responseJson = JSON.parse(jsonResponse);
    const result = v.validate(responseJson, schema);
    if (result.errors.length > 0) {
      console.error(result.errors);
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function chatLogToString(chatLog: ChatMessage[]) {
  let chatLogString = "";

  for (let i = 0; i < chatLog.length; i++) {
    const msg = chatLog[i];
    chatLogString += `${msg.senderName || msg.sender}: ${msg.message}\n`;
  }
  return chatLogString;
}

export function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    console.log(`Error parsing string: ${str}`);
    return false;
  }
  return true;
}

export const SIMULTAION_VIEWED_KEY = "viewed-simulation";

export function getSimulationViewedKey(stageId: string): string {
  return `${SIMULTAION_VIEWED_KEY}-${stageId}`;
}

/**
 * Result of attempting to acquire a processing lock
 */
export interface ProcessingLockResult {
  success: boolean;
  room: Room | null;
  reason?:
    | "ALREADY_PROCESSING"
    | "MAX_RETRIES"
    | "ROOM_NOT_FOUND"
    | "ROOM_DELETED";
}

/**
 * Attempts to acquire a processing lock on a room using optimistic locking with retries.
 *
 * Flow:
 * 1. Try to set phase=PROCESSING and increment version (only if versionNumber matches)
 * 2. If successful, return success with the updated room
 * 3. If failed (version changed):
 *    - Fetch fresh room state
 *    - If room doesn't exist or is deleted → return ROOM_NOT_FOUND
 *    - If room.phase === PROCESSING → return ALREADY_PROCESSING (someone else has lock)
 *    - Otherwise, retry with new versionNumber
 * 4. Repeat up to MAX_RETRIES times
 * 5. If max retries exceeded → return MAX_RETRIES with latest room state
 *
 * @param roomId - The ID of the room to lock
 * @param currentVersionNumber - The current version number of the room (for optimistic locking)
 * @param RoomModel - The Mongoose Room model
 * @returns ProcessingLockResult indicating success/failure and the latest room state
 */
export async function verifyProcessingLock(
  roomId: string,
  currentVersionNumber: number,
  RoomModel: RoomModelType
): Promise<ProcessingLockResult> {
  const MAX_RETRIES = 3;
  let attempt = 0;
  let versionNumber = currentVersionNumber;

  while (attempt < MAX_RETRIES) {
    console.log(
      `[verifyProcessingLock] Attempt ${
        attempt + 1
      }/${MAX_RETRIES} for room ${roomId} with version ${versionNumber}`
    );

    // Try to acquire the lock by setting phase to PROCESSING
    const roomSetToProcessing = await RoomModel.findOneAndUpdate(
      {
        _id: roomId,
        versionNumber: versionNumber,
        deletedRoom: false, // Edge case: don't lock deleted rooms
      },
      {
        $set: { phase: RoomPhase.PROCESSING },
        $inc: { versionNumber: 1 },
      },
      { new: true }
    );

    // Success! We got the lock
    if (roomSetToProcessing) {
      console.log(
        `[verifyProcessingLock] Successfully acquired lock for room ${roomId}`
      );
      return {
        success: true,
        room: roomSetToProcessing.toObject(),
      };
    }

    // Failed to get lock, fetch fresh room state to understand why
    console.log(
      `[verifyProcessingLock] Failed to acquire lock for room ${roomId}, checking room state...`
    );

    const freshRoom = await RoomModel.findOne({
      _id: roomId,
      deletedRoom: false,
    });

    // Edge case: Room doesn't exist or was deleted
    if (!freshRoom) {
      console.log(
        `[verifyProcessingLock] Room ${roomId} not found or was deleted`
      );
      return {
        success: false,
        room: null,
        reason: "ROOM_NOT_FOUND",
      };
    }

    // Check if someone else already has the lock
    if (freshRoom.phase === RoomPhase.PROCESSING) {
      console.log(
        `[verifyProcessingLock] Room ${roomId} is already being processed by another request`
      );
      return {
        success: false,
        room: freshRoom.toObject(),
        reason: "ALREADY_PROCESSING",
      };
    }

    // Room was updated for another reason (e.g., chat message), retry with new version
    console.log(
      `[verifyProcessingLock] Room ${roomId} was updated (version ${freshRoom.versionNumber}), retrying...`
    );
    versionNumber = freshRoom.versionNumber;
    attempt++;
  }

  // Max retries exceeded, fetch final state and return
  console.log(`[verifyProcessingLock] Max retries exceeded for room ${roomId}`);
  const finalRoom = await RoomModel.findOne({
    _id: roomId,
    deletedRoom: false,
  });

  return {
    success: false,
    room: finalRoom ? finalRoom.toObject() : null,
    reason: "MAX_RETRIES",
  };
}
