/*

*/

import { GraphQLObjectType } from "graphql";
import {
  makeConnection,
  PaginatedResolveArgs,
  PaginatedResolveResult,
} from "../types/connection";
import { HasPaginate } from "../types/mongoose-type-helpers";

export function findAll<T extends PaginatedResolveResult>(config: {
  nodeType: GraphQLObjectType;
  model: HasPaginate<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): any {
  const { nodeType, model } = config;
  return makeConnection({
    nodeType,
    resolve: async (resolveArgs: PaginatedResolveArgs) => {
      const { args } = resolveArgs;

      const cursor = args.cursor;
      let next = null;
      let prev = null;
      if (cursor) {
        if (cursor.startsWith("prev__")) {
          prev = cursor.split("prev__")[1];
        } else if (cursor.startsWith("next__")) {
          next = cursor.split("next__")[1];
        } else {
          next = cursor;
        }
      }

      return await model.paginate({
        query: {
          deleted: { $ne: true },
          ...(args.filter ? JSON.parse(decodeURI(args.filter)) : {}),
        },
        limit: Number(args.limit) || 100,
        paginatedField: args.sortBy || "_id",
        sortAscending: args.sortAscending,
        next: next,
        previous: prev,
      });
    },
  });
}

export default findAll;
