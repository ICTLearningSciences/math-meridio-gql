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

export enum PlayerComputedState {
  NEVER_ACCESSED_ACTIVITY = "NEVER_ACCESSED_ACTIVITY", // no heartebeat ever recorded
  PAUSED_BY_ADMIN = "PAUSED_BY_ADMIN", // paused by admin
  REPORTED_AWAY_BY_OTHER_PLAYER = "REPORTED_AWAY_BY_OTHER_PLAYER", // reported away by other player
  REPORTED_AWAY_BY_FRONTEND_DETECTION = "REPORTED_AWAY_BY_FRONTEND_DETECTION", // reported away by frontend detection
  INACTIVE = "INACTIVE", // no heartbeat in the last 15 seconds
  ACTIVE = "ACTIVE", // heartbeat in the last 15 seconds
}

export interface ReportedAwayStatus {
  isAway: boolean;
  reportedAwayAt?: Date;
  reportedBy?: "STUDENT" | "FRONTEND_SYSTEM";
}

export interface PlayerStatusData {
  lastHeartbeatAt?: Date;
  reportedAwayStatus: ReportedAwayStatus;
  pausedByAdmin: boolean;
  computedState: PlayerComputedState;
}

export type PlayerStatusRecord = Record<string, PlayerStatusData>;

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
        curGameState {
          curState
          playersLeftToRespond
          curRoundNumber
          selectedQuestion
          studentReflections
        }
        persistTruthGlobalStateData
        playersGameStateData
        playersStatusRecord
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

export const pingGameRoomProcessMutation = `
  mutation PingGameRoomProcess($roomId: String!, $sessionId: String!) {
    pingGameRoomProcess(roomId: $roomId, sessionId: $sessionId) {
      ${fullRoomData}
    }
  }
`;

export const joinGameRoomMutation = `
  mutation JoinGameRoom($roomId: String!) {
    joinGameRoom(roomId: $roomId) {
       ${fullRoomData}
    }
  }
`;

export const leaveGameRoomMutation = `
  mutation LeaveGameRoom($roomId: String!) {
    leaveGameRoom(roomId: $roomId) {
      ${fullRoomData}
    }
  }
`;

export const viewGameRoomSimulationMutation = `
  mutation ViewGameRoomSimulation($roomId: String!) {
    viewGameRoomSimulation(roomId: $roomId) {
       ${fullRoomData}
    }
  }
`;

export const submitReadyToContinueMutation = `
  mutation SubmitReadyToContinue($roomId: String!) {
    submitReadyToContinue(roomId: $roomId)
  }
`;

export const reportPlayerAwayMutation = `
  mutation ReportPlayerAway($roomId: String!, $playerId: ID!) {
    reportPlayerAway(roomId: $roomId, playerId: $playerId) {
      ${fullRoomData}
    }
  }
`;

export const clearAwayStatusMutation = `
  mutation ClearAwayStatus($roomId: String!, $playerId: ID!) {
    clearAwayStatus(roomId: $roomId, playerId: $playerId) {
      ${fullRoomData}
    }
  }
`;

export const setPlayerPauseStatusMutation = `
  mutation SetPlayerPauseStatus($roomId: String!, $playerId: ID!, $isPaused: Boolean!) {
    setPlayerPauseStatus(roomId: $roomId, playerId: $playerId, isPaused: $isPaused) {
      ${fullRoomData}
    }
  }
`;
