/*

*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import fetchRooms from "./query/fetch-rooms";
import createNewRoom from "./mutation/create-new-room";

// Queries

const PublicRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    fetchRooms,
  },
});

const PublicMutation = new GraphQLObjectType({
  name: "PublicMutation",
  fields: {
    createNewRoom,
  },
});

export default new GraphQLSchema({
  query: PublicRootQuery,
  mutation: PublicMutation,
});
