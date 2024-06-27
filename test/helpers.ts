/*

*/

import path from "path";

export function fixturePath(p: string): string {
  return path.join(__dirname, "fixtures", p);
}

export interface GqlBody {
  query: string;
  variables?: Record<string, any>;
}
