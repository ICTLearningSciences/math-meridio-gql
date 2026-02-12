/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

export enum PromptRoles {
  SYSTEM = "system",
  USER = "user",
  ASSISSANT = "assistant",
  FUNCTION = "function",
}

export enum PromptOutputDataType {
  JSON = "JSON",
  TEXT = "TEXT",
}

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export const fullRoomData = `
      _id
      name
      classId
      gameData {
        gameId
        players {
          _id
        }
        chat {
          message
        }
        persistTruthGlobalStateData
        playersGameStateData
        globalStateData {
          curStageId
          curStepId
          roomOwnerId
          discussionData
          gameStateData
        }
      }
      deletedRoom`;

export const createNewGameRoomMutation = `
  mutation CreateNewGameRoom($gameId: String!, $classId: String) {
    createNewGameRoom(gameId: $gameId, classId: $classId) {
      ${fullRoomData}
    }
  }
`;

export const sendMessageToGameRoomMutation = `
  mutation SendMessageToGameRoom($roomId: ID!, $message: String!, $sessionId: String!) {
    sendMessageToGameRoom(roomId: $roomId, message: $message, sessionId: $sessionId) {
      ${fullRoomData}
    }
  }
`;
