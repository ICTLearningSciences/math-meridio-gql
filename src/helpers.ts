/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import Ajv from "ajv";
const ajv = new Ajv();
import * as dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();

const queryPayloadSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      maxLength: 2000,
    },
    variables: {
      type: "null",
    },
  },
};

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
export function verifyQueryPayload(req: any, res: any) {
  validateJson(req, res, queryPayloadSchema);
}

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
export function validateJson(req: any, res: any, schema: any) {
  const body = req.body;
  if (!body) {
    return res.status(400).send({ error: "Expected Body" });
  }
  const validate = ajv.compile(schema);
  const valid = validate(body);
  if (!valid) {
    console.log(validate.errors);
    throw new Error(`invalid request`);
  }
}

// check if id is a valid ObjectID:
//  - if valid, return it
//  - if invalid, create a valid object id
export function idOrNew(id: string): string {
  if (!Boolean(id)) {
    return `${new mongoose.Types.ObjectId()}`;
  }
  return isId(id) ? id : `${new mongoose.Types.ObjectId()}`;
}

export function isId(id: string): boolean {
  return Boolean(id.match(/^[0-9a-fA-F]{24}$/));
}
