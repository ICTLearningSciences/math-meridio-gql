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
import {
  createNewGameRoomMutation,
  fullRoomData,
  PromptRoles,
  sendMessageToGameRoomMutation,
  UserRole,
} from "../../../src/schemas/types/types";
import { getToken } from "../../helpers";
import { EducationalRole } from "../../../src/schemas/models/Player";
import {
  CONDITIONAL_DISCUSSION_CLIENT_ID,
  PROMPT_DISCUSSION_CLIENT_ID,
  REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID,
} from "../../../src/authoritative-server/games/unit-test-game";
import sinon from "sinon";
import * as llmRequest from "../../../src/authoritative-server/llm-request/llm-request";
import { AiServicesResponseTypes } from "../../../src/authoritative-server/llm-request/ai-services/ai-service-types";
import { SenderType } from "../../../src/authoritative-server/llm-request/types";

describe("full room lifecycle", () => {
  let app: Express;
  const syncLlmRequestStub = sinon.stub(llmRequest, "syncLlmRequest");

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
    syncLlmRequestStub.restore();
  });

  it(`single user room lifecycle`, async () => {
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
    console.log(JSON.stringify(createNewGameRoomResponse.body, null, 2));
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

    // Prompt Step: Send a message which will be passed to the prompt step.
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

    // Set up the LLM request mock, this will be called when the prompt step is processed.
    syncLlmRequestStub.onFirstCall().resolves({
      answer: JSON.stringify({
        prompt_response: "Mocked analysis of the prompt",
      }),
    } as AiServicesResponseTypes);

    // sending the message
    const sendMessageForPrompt = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "My Prompt Input",
          sessionId: "session1",
        },
      });
    expect(sendMessageForPrompt.status).to.equal(200);
    expect(sendMessageForPrompt.body.data.sendMessageToGameRoom).to.exist;

    // ENSURE users message is added to the chat log
    const roomAfterPrompt = await RoomModel.findById(newRoomId);
    expect(roomAfterPrompt?.gameData.chat[6].message).to.equal(
      "My Prompt Input"
    );
    expect(roomAfterPrompt?.gameData.chat[6].senderId).to.equal(player1Id);

    // ENSURE promptText sent in request gets updated with {{user_input_prompt}}
    expect(
      syncLlmRequestStub.calledWithMatch({
        prompts: [
          {
            promptText: "Process the users prompt: My Prompt Input",
            promptRole: PromptRoles.SYSTEM as any,
          },
        ],
      })
    ).to.be.true;

    // ENSURE that prompt_response gets added to the global state data.
    const globalGameStateData =
      roomAfterPrompt?.gameData.globalStateData.gameStateData;
    const promptResponse = globalGameStateData?.["prompt_response"];
    expect(promptResponse).to.equal("Mocked analysis of the prompt");

    // ENSURE that the prompt_response gets sent as a system message
    expect(roomAfterPrompt?.gameData.chat[7].message).to.equal(
      "Mocked analysis of the prompt"
    );
    expect(roomAfterPrompt?.gameData.chat[7].sender).to.equal(
      SenderType.SYSTEM
    );

    // Conditional Stage:
    // ENSURE moved on to conditional stage request user input step
    expect(roomAfterPrompt?.gameData.globalStateData.curStageId).to.equal(
      CONDITIONAL_DISCUSSION_CLIENT_ID
    );
    expect(roomAfterPrompt?.gameData.globalStateData.curStepId).to.equal("2");
    // ENSURE conditional stage intro messages are sent up to the request user input step.
    expect(roomAfterPrompt?.gameData.chat[8].message).to.equal(
      "Welcome to the conditional discussion"
    );
    expect(roomAfterPrompt?.gameData.chat[9].message).to.equal(
      "Please enter number 1 or 2"
    );

    // Send user message to the room, should add the message to the chat log and then jump to the proper step based on conditional input.
    const sendMessageToConditional = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "1",
          sessionId: "session1",
        },
      });
    expect(sendMessageToConditional.status).to.equal(200);
    expect(sendMessageToConditional.body.data.sendMessageToGameRoom).to.exist;

    // ENSURE users message is added to the chat log
    const roomAfterConditional = await RoomModel.findById(newRoomId);
    expect(roomAfterConditional?.gameData.chat[10].message).to.equal("1");
    expect(roomAfterConditional?.gameData.chat[10].senderId).to.equal(
      player1Id
    );

    // ENSURE user_input_number is saved to discussion data
    const dicussionData =
      roomAfterConditional?.gameData.globalStateData.discussionData || {};
    const userInputNumber = dicussionData.user_input_number;
    expect(userInputNumber).to.equal("1");

    // ENSURE that we get the correct response message based on the input number.
    expect(roomAfterConditional?.gameData.chat[11].message).to.equal(
      "You entered number 1"
    );

    // ENSURE final message is sent
    expect(roomAfterConditional?.gameData.chat[12].message).to.equal(
      "Thank you for playing!"
    );

    // Now loops back to request user input stage. Test again to ensure that we can do re-runs:
    expect(roomAfterConditional?.gameData.globalStateData.curStageId).to.equal(
      REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID
    );
    expect(roomAfterConditional?.gameData.globalStateData.curStepId).to.equal(
      "2"
    );
    expect(roomAfterConditional?.gameData.chat[13].message).to.equal(
      "Welcome to the request user input discussion"
    );
    expect(roomAfterConditional?.gameData.chat[14].message).to.equal(
      "What is your name?"
    );
    expect(roomAfterConditional?.gameData.chat.length).to.equal(15);

    const sendNameMessageAgain = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: sendMessageToGameRoomMutation,
        variables: {
          roomId: newRoomId,
          message: "Jane Doe",
          sessionId: "session1",
        },
      });
    expect(sendNameMessageAgain.status).to.equal(200);
    expect(sendNameMessageAgain.body.data.sendMessageToGameRoom).to.exist;

    const roomAfterNameMessage = await RoomModel.findById(newRoomId);
    expect(roomAfterNameMessage?.gameData.chat[15].message).to.equal(
      "Jane Doe"
    );
    expect(roomAfterNameMessage?.gameData.chat[15].senderId).to.equal(
      player1Id
    );
    expect(roomAfterNameMessage?.gameData.chat[16].message).to.equal(
      "Hello, Jane Doe!"
    );
    expect(roomAfterNameMessage?.gameData.chat[16].sender).to.equal(
      SenderType.SYSTEM
    );

    // Then to the prompt stage again:
    expect(roomAfterNameMessage?.gameData.globalStateData.curStageId).to.equal(
      PROMPT_DISCUSSION_CLIENT_ID
    );
    expect(roomAfterNameMessage?.gameData.globalStateData.curStepId).to.equal(
      "2"
    );
    expect(roomAfterNameMessage?.gameData.chat[17].message).to.equal(
      "Welcome to the prompt discussion"
    );
    expect(roomAfterNameMessage?.gameData.chat[18].message).to.equal(
      "What is your prompt?"
    );
    expect(roomAfterNameMessage?.gameData.chat.length).to.equal(19);

    // Verify the stub was called
    expect(syncLlmRequestStub.called).to.be.true; // Should be false since we haven't hit a prompt step yet
  });

  it("multiple user room lifecycle");
});
