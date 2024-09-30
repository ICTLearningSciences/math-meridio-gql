/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

require("source-map-support/register");
import serverlessExpress from "@vendia/serverless-express";
import createApp, { appStart } from "./app";

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
let serverlessExpressInstance: any;

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
async function setup(event: any, context: any) {
  await appStart();
  serverlessExpressInstance = serverlessExpress({ app: createApp() });
  return serverlessExpressInstance(event, context);
}

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
function handler(event: any, context: any) {
  if (serverlessExpressInstance)
    return serverlessExpressInstance(event, context);

  return setup(event, context);
}

exports.handler = handler;
