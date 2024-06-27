/*

*/

import { GraphQLObjectType, GraphQLSchema } from "graphql";

// import fetchConfig from './query/fetchConfig'

const PrivateRootQuery = new GraphQLObjectType({
  name: "PublicRootQueryType",
  fields: {
    // fetchConfig
  },
});

export default new GraphQLSchema({
  query: PrivateRootQuery,
});
