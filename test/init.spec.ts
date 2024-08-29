/*

*/

import dotenv from "dotenv";
import { appStop } from "../src/app";
import { logger } from "../src/utils/logging";
import mongoUnit from "mongo-unit";
import { fixturePath } from "./helpers";
import { before, after } from "mocha";

before(() => {
  dotenv.config({ path: fixturePath(".env") });
  process.env.DOTENV_PATH = fixturePath(".env");
});

after(async () => {
  try {
    await appStop();
  } catch (mongooseDisconnectErr) {
    logger.error(mongooseDisconnectErr);
  }
  try {
    await mongoUnit.stop();
  } catch (mongoUnitErr) {
    logger.error(mongoUnitErr);
  }
});

mongoUnit.start().then((url) => {
  console.log(url);
  process.env.MONGO_URI = url; // this const process.env.DATABASE_URL = will keep link to fake mongo
  run(); // this line start mocha tests
});
