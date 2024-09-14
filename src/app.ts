/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import express, { Express, Request } from "express";
import { graphqlHTTP } from "express-graphql";
import bodyParser from "body-parser";
import cors from "cors";
import publicSchema from "./schemas/publicSchema";
import * as dotenv from "dotenv";
dotenv.config();

const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["https://dev.meridiomath.org"];

//START MIDDLEWARE
import mongoose from "mongoose";
import privateSchema from "./schemas/privateSchema";

// eslint-disable-next-line   @typescript-eslint/no-explicit-any
const authorization = (req: any, res: any, next: any) => {
  if (process.env.ENV === "dev") {
    return next();
  }
  if (!req.body.data || !req.body.data.secret) {
    console.log(`failed to authorize, expected body`);
    return res
      .status(403)
      .send({ error: `failed to authorize, expected body` });
  }
  //when sending from postman: req.body.secret, else from webpage: req.body.data.secret
  const secret = req.body.data.secret;
  if (!secret) {
    console.log(`failed to authorize, expected secret`);
    return res
      .status(403)
      .send({ error: `failed to authorize, expected secret` });
  }
  if (secret !== process.env.GQL_SECRET) {
    console.log(`failed to authorize, secrets do not match`);
    return res
      .status(403)
      .send({ error: `failed to authorize, secret does not match` });
  }
  return next();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const corsOptions = {
  credentials: true,
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: string) => void
  ) {
    if (!origin) {
      callback(null, "");
    } else {
      let allowOrigin = false;
      for (const co of CORS_ORIGIN) {
        if (origin === co || origin.endsWith(co)) {
          allowOrigin = true;
          break;
        }
      }
      if (allowOrigin) {
        callback(null, origin);
      } else {
        callback(new Error(`${origin} not allowed by CORS`));
      }
    }
  },
};

export async function appStart(): Promise<void> {
  const mongooseConnect = (await import("./utils/mongoose-connect")).default;
  await mongooseConnect(process.env.MONGO_URI || "");
}

export async function appStop(): Promise<void> {
  try {
    mongoose.connection.removeAllListeners();
    await mongoose.disconnect();
  } catch (err) {
    console.error("error on mongoose disconnect: " + err);
  }
}

function getSubdomainFromRequest(req: Request): string {
  try {
    const origin = req.header("origin");
    if (origin) {
      const subdomain = /:\/\/([^\/]+)/.exec(origin)[1].split(".")[0];
      return subdomain || "";
    }
    return "";
  } catch (err) {
    return "";
  }
}

export function createApp(): Express {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());
  // app.use(cors(corsOptions));
  app.use(
    "/graphqlPrivate",
    authorization,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    graphqlHTTP(async (req: Request, res) => {
      return {
        schema: privateSchema,
        graphiql: true,
      };
    })
  );

  app.use(
    "/graphql",
    graphqlHTTP(async (req: Request, res) => {
      return {
        schema: publicSchema,
        graphiql: true,
        context: {
          req: req,
          res: res,
          subdomain: getSubdomainFromRequest(req),
        },
      };
    })
  );
  return app;
}

export default createApp;
