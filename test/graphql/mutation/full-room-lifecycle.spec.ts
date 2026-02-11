/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import { player1Id } from "../../fixtures/mongodb/data";
import RoomModel from "../../../src/schemas/models/Room";
import { UserRole } from "../../../src/schemas/types/types";
import { getToken } from "../../helpers";
import { EducationalRole } from "../../../src/schemas/models/Player";
import {
  PROMPT_DISCUSSION_CLIENT_ID,
  REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID,
} from "../../../src/authoritative-server/games/unit-test-game";

const fullRoomData = `
      _id
      name
      classId
      gameData {
        gameId
        players {
          _id
        }
        chat {
          message
        }
        persistTruthGlobalStateData
        playerStateData {
          player
          animation
          gameStateData {
            key
            value
          }
        }
        globalStateData {
          curStageId
          curStepId
          roomOwnerId
          discussionDataStringified
          gameStateData {
            key
            value
          }
        }
      }
      deletedRoom`;

const createNewGameRoomMutation = `
  mutation CreateNewGameRoom($gameId: String!, $classId: String) {
    createNewGameRoom(gameId: $gameId, classId: $classId) {
      ${fullRoomData}
    }
  }
`;

export const sendMessageToGameRoomMutation = `
  mutation SendMessageToGameRoom($roomId: ID!, $message: String!, $sessionId: String!) {
    sendMessageToGameRoom(roomId: $roomId, message: $message, sessionId: $sessionId) {
      ${fullRoomData}
    }
  }
`;

describe("full room lifecycle", () => {
  let app: Express;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it.only(`single user room lifecycle`, async () => {
    // 1: create new room, should automatically add the requesting user to the room and initialize the game room and process the first steps until the first request user input step.
    const userToken = await getToken(
      player1Id,
      UserRole.USER,
      EducationalRole.STUDENT
    );
    const createNewGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: createNewGameRoomMutation,
        variables: {
          gameId: "unit-test",
        },
      });
    expect(createNewGameRoomResponse.status).to.equal(200);
    expect(createNewGameRoomResponse.body.data.createNewGameRoom).to.exist;
    const newRoomId = createNewGameRoomResponse.body.data.createNewGameRoom._id;
    const newRoom = await RoomModel.findById(newRoomId);
    expect(newRoom).to.exist;
    expect(newRoom?.gameData.players[0]).to.equal(player1Id);
    expect(newRoom?.gameData.gameId).to.equal("unit-test");
    expect(newRoom?.gameData.globalStateData.curStageId).to.equal(
      REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID
    );
    // 2nd step is the first request user input step, so we expect the current step id to be 2.
    expect(newRoom?.gameData.globalStateData.curStepId).to.equal("2");

    // Check that the chat log has the correct messages.
    expect(newRoom?.gameData.chat).to.have.length(2);
    expect(newRoom?.gameData.chat[0].message).to.equal(
      "Welcome to the request user input discussion"
    );
    expect(newRoom?.gameData.chat[1].message).to.equal("What is your name?");

    // 3. Send a message to the room, should add the message to the chat log, check if we can progress to the next step, if true, then process till the next request user input step.
    const sendMessageToGameRoomResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Jonny Appleseed",
          sessionId: "session1",
        },
      });
    expect(sendMessageToGameRoomResponse.status).to.equal(200);
    expect(sendMessageToGameRoomResponse.body.data.sendMessageToGameRoom).to
      .exist;

    // Should have added the message to the chat log and progress to the next request user input step (from next stage)
    const updatedRoom = await RoomModel.findById(newRoomId);
    expect(updatedRoom?.gameData.chat).to.have.length(6);
    expect(updatedRoom?.gameData.chat[2].message).to.equal("Jonny Appleseed");
    expect(updatedRoom?.gameData.chat[3].message).to.equal(
      "Hello, Jonny Appleseed!"
    );
    // and the next stage info
    expect(updatedRoom?.gameData.globalStateData.curStageId).to.equal(
      PROMPT_DISCUSSION_CLIENT_ID
    );
    expect(updatedRoom?.gameData.globalStateData.curStepId).to.equal("2");
    expect(updatedRoom?.gameData.chat[4].message).to.equal(
      "Welcome to the prompt discussion"
    );
    expect(updatedRoom?.gameData.chat[5].message).to.equal(
      "What is your prompt?"
    );

    // TODO: Continue through the prompt, and then through the conditional flows. Will need to mock prompt response.

    // Prompt:
    // ENSURE promptText sent in request gets updated with {{user_input_prompt}}
    // ENSURE that prompt_response gets added to the global state data.
    // ENSURE that the prompt_response gets sent as a system message

    // Should then move on to conditional stage

    // Conditional:
    // ENSURE user_input_number is saved to discussion data
    // ENSURE that we get the correct stage response based on the input number.

    // Loop back around and do part 1 again to check for re-run bugs?
  });

  it("multiple user room lifecycle");
});
