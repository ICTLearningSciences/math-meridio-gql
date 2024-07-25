/*

*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";
import addOrUpdateDiscussionStage from "./mutation/private/add-or-update-stage";

const PrivateRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {},
});

const PrivateMutation = new GraphQLObjectType({
  name: "PrivateMutation",
  fields: {
    addOrUpdateDiscussionStage,
  },
});

export default new GraphQLSchema({
  query: PrivateRootQuery,
  mutation: PrivateMutation,
});
