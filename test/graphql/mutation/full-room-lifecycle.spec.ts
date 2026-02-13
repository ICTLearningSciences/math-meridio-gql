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
import RoomModel, { Room } from "../../../src/schemas/models/Room";
import {
  createNewGameRoomMutation,
  fullRoomData,
  pingGameRoomProcessMutation,
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

    // 3. Send a message to the room, should add the message to the chat log
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

    // Should have added the message to the chat log
    let updatedRoom = (await RoomModel.findById(newRoomId))?.toObject();
    expect(updatedRoom?.gameData.chat).to.have.length(3);
    expect(updatedRoom?.gameData.chat[2].message).to.equal("Jonny Appleseed");

    // Send a ping to the process endpoint to process the complete request user input step and continue processing the steps up to the next request user input step (which will be the prompt step).
    const pingGameRoomProcessResponse = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    expect(pingGameRoomProcessResponse.status).to.equal(200);
    updatedRoom = pingGameRoomProcessResponse.body.data.pingGameRoomProcess;
    expect(updatedRoom?.gameData.chat[3].message).to.equal(
      "Hello, Jonny Appleseed!"
    );
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

    // Send our message to the room for the request user input prompt step.
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
    const roomAfterPromptMessage = await RoomModel.findById(newRoomId);
    expect(roomAfterPromptMessage?.gameData.chat[6].message).to.equal(
      "My Prompt Input"
    );
    expect(roomAfterPromptMessage?.gameData.chat[6].senderId).to.equal(
      player1Id
    );

    // Send another ping to the process endpoint to process the complete prompt step and continue processing the steps up to the next request user input step (which will be the conditional stage).
    // Set up the LLM request mock, this will be called when the prompt step is processed.
    syncLlmRequestStub.onFirstCall().resolves({
      answer: JSON.stringify({
        prompt_response: "Mocked analysis of the prompt",
      }),
    } as AiServicesResponseTypes);

    const pingGameRoomToProcessConditional = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });

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

    const roomAfterProcessingPrompt: Room | null = await RoomModel.findById(
      newRoomId
    );

    // ENSURE that prompt_response gets added to the global state data.
    const globalGameStateData =
      roomAfterProcessingPrompt?.gameData.globalStateData.gameStateData;
    const promptResponse = globalGameStateData?.["prompt_response"];
    expect(promptResponse).to.equal("Mocked analysis of the prompt");

    // ENSURE that the prompt_response gets sent as a system message
    expect(roomAfterProcessingPrompt?.gameData.chat[7].message).to.equal(
      "Mocked analysis of the prompt"
    );
    expect(roomAfterProcessingPrompt?.gameData.chat[7].sender).to.equal(
      SenderType.SYSTEM
    );

    // Conditional Stage:
    // ENSURE moved on to conditional stage request user input step
    expect(
      roomAfterProcessingPrompt?.gameData.globalStateData.curStageId
    ).to.equal(CONDITIONAL_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingPrompt?.gameData.globalStateData.curStepId
    ).to.equal("2");
    // ENSURE conditional stage intro messages are sent up to the request user input step.
    expect(roomAfterProcessingPrompt?.gameData.chat[8].message).to.equal(
      "Welcome to the conditional discussion"
    );
    expect(roomAfterProcessingPrompt?.gameData.chat[9].message).to.equal(
      "Please enter number 1 or 2"
    );

    // Send user message to the room, should add the message to the chat log
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

    // Send another ping to the process endpoint to process the complete conditional step and continue processing the steps up to the next request user input step (which will be BACK to the request user input stage).

    const pingGameRoomToProcessConditionalStage = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    const roomAfterProcessingConditional: Room | null =
      await RoomModel.findById(newRoomId);

    // ENSURE that we get the correct response message based on the input number.
    expect(roomAfterProcessingConditional?.gameData.chat[11].message).to.equal(
      "You entered number 1"
    );

    // ENSURE final message is sent
    expect(roomAfterProcessingConditional?.gameData.chat[12].message).to.equal(
      "Thank you for playing!"
    );

    // Now loops back to request user input stage. Test again to ensure that we can do re-runs:
    expect(
      roomAfterProcessingConditional?.gameData.globalStateData.curStageId
    ).to.equal(REQUEST_USER_INPUT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingConditional?.gameData.globalStateData.curStepId
    ).to.equal("2");
    expect(roomAfterProcessingConditional?.gameData.chat[13].message).to.equal(
      "Welcome to the request user input discussion"
    );
    expect(roomAfterProcessingConditional?.gameData.chat[14].message).to.equal(
      "What is your name?"
    );
    expect(roomAfterProcessingConditional?.gameData.chat.length).to.equal(15);

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

    const pingGameToProcessRequestUserInputStageAgain = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        query: pingGameRoomProcessMutation,
        variables: {
          roomId: newRoomId,
          sessionId: "session1",
        },
      });
    const roomAfterProcessingRequestUserInputStageAgain: Room | null =
      await RoomModel.findById(newRoomId);
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[16].message
    ).to.equal("Hello, Jane Doe!");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[16].sender
    ).to.equal(SenderType.SYSTEM);

    // Then to the prompt stage again:
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.globalStateData
        .curStageId
    ).to.equal(PROMPT_DISCUSSION_CLIENT_ID);
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.globalStateData
        .curStepId
    ).to.equal("2");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[17].message
    ).to.equal("Welcome to the prompt discussion");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat[18].message
    ).to.equal("What is your prompt?");
    expect(
      roomAfterProcessingRequestUserInputStageAgain?.gameData.chat.length
    ).to.equal(19);

    // Verify the stub was called
    expect(syncLlmRequestStub.called).to.be.true; // Should be false since we haven't hit a prompt step yet
  });

  it.only("multiple user room with steps that requireAllUserInputs", async () => {

    // 1: create 4 new students to track. ownerStudent (one that creates the room), studentTwo, leavingStudent, lateStudent
    // 2: create a room with createNewGameRoomMutation for gameId "unit-test-multiple-users"
    // 3: add studentTwo and leavingStudent to the room with joinGameRoomMutation's
    
    // ENSURE all three students are in the room.
    // ENSURE chat log only has up to the first request user input
    // ENSURE is on first request user input stage and step: "test-require-all-user-inputs-discussion-client-id" and "2"
    
    // 4: ping room process

    // ENSURE still on first request user input stage and step: "test-require-all-user-inputs-discussion-client-id" and "2"

    // 5: ownerStudent send message + ping room process.

    // ENSURE message was added to the chat
    // ENSURE on the same stage and step beacuse not all user inputs done: "test-require-all-user-inputs-discussion-client-id" and "2"

    // 6: studentTwo send message + ping room process.

    // ENSURE message was added to the chat
    // ENSURE on the same stage and step beacuse not all user inputs done: "test-require-all-user-inputs-discussion-client-id" and "2"

    // 7: leavingStudent send message + ping room process.

    // ENSURE now on stage and step: "test-require-all-user-inputs-discussion-client-id" and "4"
    // ENSURE messages were sent up to this stage.

    // 8: ownerStudent and studentTwo send message + process

    // ENSURE on same stage and step: "test-require-all-user-inputs-discussion-client-id" and "4"

    // 9: leavingStudent leaves room with leaveGameRoomMutation

    // ENSURE we have now moved on to the next request user input stage because we already have inputs from the other 2 students, so should move on: "test-require-all-user-inputs-discussion-client-id" and "2"

    // 10: sendMessage from ownerStudent
    // 11: add lateStudent to room with joinGameRoomMutation

    // 12: sendMessage from studentTwo
    

    // ENSURE we are still on the same stage "test-require-all-user-inputs-discussion-client-id" and "2" because now we also need lateStudent's message

    //13: sendMessage from lateStudent

    // ENSURE moved on to next step and stage: "test-require-all-user-inputs-discussion-client-id" and "4"


    
    
    


  });
});
