/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/
import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";
import mongoose from "mongoose";
import { getToken, createUser, createRoom } from "../../helpers";
import { UserRole } from "../../../src/schemas/types/types";
import { EducationalRole } from "../../../src/schemas/models/Player";
import RoomModel from "../../../src/schemas/models/Room";
const { ObjectId } = mongoose.Types;

const syncRoomDataMutation = `
  mutation SyncRoomData($roomId: ID!, $gameData: GameDataInputType!) {
    syncRoomData(roomId: $roomId, gameData: $gameData) {
      _id
      name
      gameData {
        gameId
        players {
          _id
        }
        chat {
          message
        }
        globalStateData {
          curStageId
          curStepId
          roomOwnerId
          discussionDataStringified
        }
        playerStateData {
          player
          animation
        }
      }
    }
  }
`;

describe("sync room data", () => {
  let app: Express;

  let userId1: string;
  let userId2: string;
  let roomId: string;
  let accessToken1: string;
  let accessToken2: string;

  beforeEach(async () => {
    await mongoUnit.load(require("test/fixtures/mongodb/data-default.js"));
    app = await createApp();
    await appStart();

    userId1 = new ObjectId().toString();
    userId2 = new ObjectId().toString();
    roomId = new ObjectId().toString();

    await createUser(userId1, UserRole.USER, EducationalRole.STUDENT);
    await createUser(userId2, UserRole.USER, EducationalRole.STUDENT);
    await createRoom(roomId, undefined, [userId1]);

    accessToken1 = await getToken(
      userId1,
      UserRole.USER,
      EducationalRole.STUDENT
    );

    accessToken2 = await getToken(
      userId2,
      UserRole.USER,
      EducationalRole.STUDENT
    );
  });

  afterEach(async () => {
    await appStop();
    await mongoUnit.drop();
  });

  it(`successfully syncs room data when user is room owner`, async () => {
    const gameData: any = {
      gameId: roomId,
      players: [userId1],
      chat: [
        {
          messageId: "msg1",
          message: "Hello",
          sender: "system",
          senderId: userId1,
          senderName: "User",
          displayType: "text",
          disableUserInput: false,
          mcqChoices: [],
          sessionId: "session1",
        },
      ],
      globalStateData: {
        curStageId: "stage1",
        curStepId: "step1",
        roomOwnerId: userId1,
        discussionDataStringified: '{"name":"John Doe"}',
        gameStateData: [],
      },
      persistTruthGlobalStateData: [],
      playerStateData: [
        {
          player: userId1,
          animation: "idle",
          gameStateData: [],
        },
      ],
    };

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken1}`)
      .send({
        query: syncRoomDataMutation,
        variables: {
          roomId: roomId,
          gameData: gameData,
        },
      });
    console.log(JSON.stringify(response.body, null, 2));
    expect(response.status).to.equal(200);
    expect(response.body.data.syncRoomData).to.exist;
    expect(response.body.data.syncRoomData._id).to.equal(roomId);

    const room = await RoomModel.findById(roomId);
    expect(room?.gameData.gameId).to.equal(roomId);
    expect(room?.gameData.chat).to.have.lengthOf(1);
    expect(room?.gameData.chat[0].message).to.equal("Hello");
    expect(room?.gameData.globalStateData.curStageId).to.equal("stage1");
    expect(room?.gameData.globalStateData.curStepId).to.equal("step1");
    expect(room?.gameData.globalStateData.roomOwnerId).to.equal(userId1);
    expect(room?.gameData.globalStateData.discussionDataStringified).to.equal(
      '{"name":"John Doe"}'
    );
  });

  it(`fails when user is not authenticated`, async () => {
    const gameData: any = {
      gameId: roomId,
      players: [userId1],
      chat: [],
      globalStateData: {
        curStageId: "stage1",
        curStepId: "step1",
        roomOwnerId: userId1,
        gameStateData: [],
      },
      persistTruthGlobalStateData: [],
      playerStateData: [],
    };

    const response = await request(app)
      .post("/graphql")
      .send({
        query: syncRoomDataMutation,
        variables: {
          roomId: roomId,
          gameData: gameData,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Unauthorized");
  });

  it(`fails when user is not the room owner`, async () => {
    const gameData: any = {
      gameId: roomId,
      players: [userId1],
      chat: [],
      globalStateData: {
        curStageId: "stage1",
        curStepId: "step1",
        roomOwnerId: userId1,
        gameStateData: [],
      },
      persistTruthGlobalStateData: [],
      playerStateData: [],
    };

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken2}`)
      .send({
        query: syncRoomDataMutation,
        variables: {
          roomId: roomId,
          gameData: gameData,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Unauthorized");
  });

  it(`fails when room is deleted`, async () => {
    await RoomModel.findByIdAndUpdate(roomId, { deletedRoom: true });

    const gameData: any = {
      gameId: roomId,
      players: [userId1],
      chat: [],
      globalStateData: {
        curStageId: "stage1",
        curStepId: "step1",
        roomOwnerId: userId1,
        gameStateData: [],
      },
      persistTruthGlobalStateData: [],
      playerStateData: [],
    };

    const response = await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken1}`)
      .send({
        query: syncRoomDataMutation,
        variables: {
          roomId: roomId,
          gameData: gameData,
        },
      });

    expect(response.status).to.equal(200);
    expect(response.body.errors).to.exist;
    expect(response.body.errors[0].message).to.include("Invalid room");
  });

  it(`completely replaces existing game data`, async () => {
    const initialRoom = await RoomModel.findById(roomId);
    expect(initialRoom?.gameData.chat).to.have.lengthOf(0);

    const gameData: any = {
      gameId: roomId,
      players: [userId1],
      chat: [
        {
          messageId: "msg1",
          message: "New message",
          sender: "user",
          senderId: userId1,
          senderName: "User1",
          displayType: "text",
          disableUserInput: false,
          mcqChoices: [],
          sessionId: "session1",
        },
      ],
      globalStateData: {
        curStageId: "stage2",
        curStepId: "step2",
        roomOwnerId: userId1,
        gameStateData: [],
      },
      persistTruthGlobalStateData: [],
      playerStateData: [],
    };

    await request(app)
      .post("/graphql")
      .set("Authorization", `Bearer ${accessToken1}`)
      .send({
        query: syncRoomDataMutation,
        variables: {
          roomId: roomId,
          gameData: gameData,
        },
      });

    const updatedRoom = await RoomModel.findById(roomId);
    expect(updatedRoom?.gameData.chat).to.have.lengthOf(1);
    expect(updatedRoom?.gameData.globalStateData.curStageId).to.equal("stage2");
  });
});
