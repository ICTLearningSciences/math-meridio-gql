/*

*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import fetchRooms from "./query/fetch-rooms";
import createNewRoom from "./mutation/create-new-room";
import fetchDiscussionStages from "./query/fetch-discussion-stages";
import addOrUpdateDiscussionStage from "./mutation/add-or-update-stage";
// Queries

const PublicRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    fetchRooms,
    fetchDiscussionStages,
  },
});

const PublicMutation = new GraphQLObjectType({
  name: "PublicMutation",
  fields: {
    createNewRoom,
    addOrUpdateDiscussionStage,
  },
});

export default new GraphQLSchema({
  query: PublicRootQuery,
  mutation: PublicMutation,
});
