/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import fetchRoom from "./query/fetch-room";
import fetchRooms from "./query/fetch-rooms";
import createAndJoinRoom from "./mutation/room-create-and-join";
import joinRoom from "./mutation/room-join";
import leaveRoom from "./mutation/room-leave";
import deleteRoom from "./mutation/room-delete";
import renameRoom from "./mutation/room-rename";
import updateRoom from "./mutation/room-update";
import sendMessage from "./mutation/room-send-message";

import fetchPlayer from "./query/fetch-player";
import fetchPlayers from "./query/fetch-players";
import addOrUpdatePlayer from "./mutation/add-or-update-player";

import fetchDiscussionStages from "./query/fetch-discussion-stages";
import addOrUpdateDiscussionStage from "./mutation/private/add-or-update-stage";

const PublicRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    fetchRoom,
    fetchRooms,
    fetchPlayer,
    fetchPlayers,
    fetchDiscussionStages,
  },
});

const PublicMutation = new GraphQLObjectType({
  name: "PublicMutation",
  fields: {
    createAndJoinRoom,
    joinRoom,
    leaveRoom,
    deleteRoom,
    renameRoom,
    updateRoom,
    sendMessage,
    addOrUpdatePlayer,
    addOrUpdateDiscussionStage,
  },
});

export default new GraphQLSchema({
  query: PublicRootQuery,
  mutation: PublicMutation,
});
