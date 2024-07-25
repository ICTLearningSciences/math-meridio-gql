/*

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
