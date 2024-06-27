/*

*/

import { PaginatedResolveResult } from "./connection";

export interface Executable<T> {
  exec(): Promise<T>;
}

export interface HasFindOne<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findOne(args: any): Executable<T>;
}

export interface HasFindById<T> {
  findById(id: string): Executable<T>;
}

export interface HasPaginate<T extends PaginatedResolveResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  paginate(query?: any, options?: any, callback?: any): Promise<T>;
}

export type MongooseModel<T> = HasFindOne<T> & HasFindById<T>;
export type PaginatableMongooseModel<T extends PaginatedResolveResult> =
  HasFindOne<T> & HasFindById<T> & HasPaginate<T>;
