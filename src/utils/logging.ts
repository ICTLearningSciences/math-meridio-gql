/*

*/

import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL_GRAPHQL || "debug",
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(
      process.env.NODE_ENV?.includes("dev")
        ? { format: winston.format.simple() }
        : undefined
    ),
  ],
});

export default logger;
