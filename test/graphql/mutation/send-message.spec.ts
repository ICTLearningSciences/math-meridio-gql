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
import { nonExistentId, player1Id } from "../../fixtures/mongodb/data";
import { room1Id } from "../../fixtures/mongodb/data";

export const sendMessageMutation = `
        mutation SendMessage($roomId: ID!, $msg: ChatMessageInput!) {
          sendMessage(roomId: $roomId, msg: $msg) {
            _id
            name
            gameData {
              gameId
              players {
                _id
                name
                description
                avatar {
                  id
                }
              }
              chat {
                messageId
                message
                sender
                senderId
                senderName
                sessionId
                displayType
                disableUserInput
                mcqChoices
              }
              globalStateData {
                curStageId
                curStepId
                gameStateData {
                  key
                  value
                }
              }
              playerStateData {
                player
                animation
                gameStateData {
                  key
                  value
                }
              }
            }
          }
        }
`;

describe("send message", () => {
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

  it(`can send message to an existing room`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: sendMessageMutation,
        variables: {
          roomId: room1Id,
          msg: {
            messageId: "new message",
            message: "New Message",
            sender: "PLAYER",
            senderId: player1Id,
            senderName: "Jonny Appleseed",
            sessionId: "session1",
          },
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.sendMessage).to.eql({
      _id: room1Id,
      name: "Basketball Room 1",
      gameData: {
        gameId: "basketball",
        players: [
          {
            _id: player1Id,
            name: "Jonny Appleseed",
            description: "I want an avatar with an apple for a head",
            avatar: [{ id: "man_apple_head" }],
          },
        ],
        chat: [
          {
            messageId: "new message",
            message: "New Message",
            sender: "PLAYER",
            senderId: player1Id,
            senderName: "Jonny Appleseed",
            displayType: null,
            disableUserInput: null,
            mcqChoices: [],
            sessionId: "session1",
          },
        ],
        globalStateData: {
          curStageId: "Stage 1",
          curStepId: "Step 1",
          gameStateData: [
            {
              key: "Global variable 1",
              value: "Global variable 1 value",
            },
          ],
        },
        playerStateData: [
          {
            player: player1Id,
            animation: "",
            gameStateData: [
              {
                key: "Player variable 1",
                value: "Player variable 1 value",
              },
            ],
          },
        ],
      },
    });
  });

  it(`fails if non-existent room id`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: sendMessageMutation,
        variables: {
          roomId: nonExistentId,
          msg: {},
        },
      });
    expect(response.status).to.equal(200);
    expect(response.body).to.have.deep.nested.property(
      "errors[0].message",
      "Invalid room"
    );
  });
});
