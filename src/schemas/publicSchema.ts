/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import fetchRoom from "./query/fetch-room";
import fetchRooms from "./query/fetch-rooms";
import deleteRoom from "./mutation/room-delete";
import reportPlayerAway from "./mutation/report-player-away";
import clearAwayStatus from "./mutation/clear-away-status";
import renameRoom from "./mutation/room-rename";
import joinGameRoom from "./mutation/join-game-room";
import leaveGameRoom from "./mutation/leave-game-room";
import assignGameToGameRoom from "./mutation/assign-game-to-game-room";
import fetchPlayer from "./query/fetch-player";
import fetchPlayers from "./query/fetch-players";
import addOrUpdatePlayer from "./mutation/add-or-update-player";

import fetchDiscussionStages from "./query/fetch-discussion-stages";
import addOrUpdateDiscussionStage from "./mutation/private/add-or-update-stage";

import fetchInstructorDataHydration from "./query/fetch-instructor-data-hydration";
import fetchStudentDataHydration from "./query/fetch-student-data-hydration";
import createNewLearningObjective from "./mutation/learning-objectives/create-new-learning-objective";
import updateLearningObjective from "./mutation/learning-objectives/update-learning-objective";

import loginGoogle from "./mutation/login-google";
import refreshAccessToken from "./mutation/refresh-access-token";

import createClassroom from "./mutation/create-classroom";
import setPlayerPauseStatus from "./mutation/set-player-pause-status";
import createNewClassInviteCode from "./mutation/create-new-class-invite-code";
import revokeClassInviteCode from "./mutation/revoke-class-invite-code";
import joinClassroom from "./mutation/join-classroom";
import leaveClassroom from "./mutation/leave-classroom";
import removeStudentFromClass from "./mutation/remove-student-from-class";
import blockStudentFromClass from "./mutation/block-student-from-class";
import unblockStudentFromClass from "./mutation/unblock-student-from-class";
import adjustClassroomArchiveStatus from "./mutation/adjust-classroom-archive-status";
import updateClassNameDescription from "./mutation/update-class-name-description";
import createNewGameRoom from "./mutation/game-room-authoritative/create-new-game-room";
import fetchRoomHeartbeats from "./query/fetch-room-heartbeats";
import testLlmCall from "./mutation/llm/test-llm-call";
import roomHeartBeat from "./mutation/room-heart-beat";
import sendMessageToGameRoom from "./mutation/game-room-authoritative/send-message-to-game-room";
import pingGameRoomProcess from "./mutation/ping-game-room-process";
import updatePlayerGameStateData from "./mutation/update-player-game-state-data";
import viewGameRoomSimulation from "./mutation/view-game-room-simulation";
import fetchGamesList from "./query/fetch-games-list";
import assignStudentToGroup from "./mutation/assign-student-to-group";
import assignClassGroupsAndStart from "./mutation/assign-class-groups-and-start";
import submitGamePhaseReflection from "./mutation/submit-game-phase-reflection";
import submitReadyToContinue from "./mutation/room-sumbit-ready-to-continue";
import createClassMembership from "./mutation/create-class-membership";
import shareClassroomWithInstructor from "./mutation/share-classroom-with-instructor";
import fetchGamePhaseReflections from "./query/fetch-game-phase-reflections";
import setNeedsHelpInGameRoom from "./mutation/needs-help-in-game-room";
import fetchLearningObjectives from "./query/fetch-learning-objectives";
import dismissNotifications from "./mutation/dismiss-notifications";

const PublicRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    fetchRoom,
    fetchRooms,
    fetchPlayer,
    fetchPlayers,
    fetchDiscussionStages,
    fetchInstructorDataHydration,
    fetchStudentDataHydration,
    fetchRoomHeartbeats,
    fetchGamesList,
    fetchGamePhaseReflections,
    fetchLearningObjectives,
  },
});

const PublicMutation = new GraphQLObjectType({
  name: "PublicMutation",
  fields: {
    deleteRoom,
    reportPlayerAway,
    clearAwayStatus,
    renameRoom,
    setPlayerPauseStatus,
    addOrUpdatePlayer,
    addOrUpdateDiscussionStage,
    createClassMembership,
    shareClassroomWithInstructor,
    loginGoogle,
    refreshAccessToken,
    createClassroom,
    createNewClassInviteCode,
    dismissNotifications,
    revokeClassInviteCode,
    joinClassroom,
    leaveClassroom,
    removeStudentFromClass,
    blockStudentFromClass,
    unblockStudentFromClass,
    assignStudentToGroup,
    assignClassGroupsAndStart,
    adjustClassroomArchiveStatus,
    updateClassNameDescription,
    createNewGameRoom,
    roomHeartBeat,
    submitReadyToContinue,
    testLlmCall,
    sendMessageToGameRoom,
    joinGameRoom,
    assignGameToGameRoom,
    updatePlayerGameStateData,
    leaveGameRoom,
    pingGameRoomProcess,
    viewGameRoomSimulation,
    submitGamePhaseReflection,
    setNeedsHelpInGameRoom,
    createNewLearningObjective,
    updateLearningObjective,
  },
});

export default new GraphQLSchema({
  query: PublicRootQuery,
  mutation: PublicMutation,
});
