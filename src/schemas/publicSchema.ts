/*

*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import fetchRooms from "./query/fetch-rooms";
import createNewRoom from "./mutation/create-new-room";
import fetchPlayer from "./query/fetch-player";
import fetchPlayers from "./query/fetch-players";
import updatePlayer from "./mutation/update-player";

// Queries

const PublicRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    fetchRooms,
    fetchPlayer,
    fetchPlayers,
  },
});

const PublicMutation = new GraphQLObjectType({
  name: "PublicMutation",
  fields: {
    createNewRoom,
    updatePlayer,
  },
});

export default new GraphQLSchema({
  query: PublicRootQuery,
  mutation: PublicMutation,
});
