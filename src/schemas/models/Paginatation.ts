/*

*/

import { Document, Model, Schema } from "mongoose";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mongoPaging = require("mongo-cursor-pagination");

mongoPaging.config.COLLATION = { locale: "en", strength: 2 };
mongoPaging.config.MAX_LIMIT = 5000;

export interface PaginatedResolveResult<T> {
  results: T[];
  previous: string;
  next: string;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface PaginateCallback<T> {
  (err: Error, doc: T): void;
}

export interface PaginateOptions {
  limit?: number;
}

export type PaginateQuery<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k in keyof T]: any;
};

export function pluginPagination<
  DocType = Document,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  M extends Model<DocType, any, any> = Model<any, any, any>,
  SchemaDefinitionType = undefined,
  TInstanceMethods = M
>(s: Schema<DocType, M, SchemaDefinitionType, TInstanceMethods>): void {
  s.plugin(mongoPaging.mongoosePlugin);
}
