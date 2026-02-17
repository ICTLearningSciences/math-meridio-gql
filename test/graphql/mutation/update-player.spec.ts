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
import { player1Id, player2Id } from "../../fixtures/mongodb/data";

export const addOrUpdatePlayerMutation = `
  mutation AddOrUpdatePlayer($playerId: String!, $playerFieldsToUpdate: PlayerInput!) {
    addOrUpdatePlayer(playerId: $playerId, playerFieldsToUpdate: $playerFieldsToUpdate) {
      _id
      name
      description
      avatar {
        id
      }
    }
  }
`;

export const fetchPlayersQuery = `
query {
        fetchPlayers {
          edges {
            node {
              _id
              name
              description
              avatar {
                id
              }
            }
          }
        }
      }
`;
describe("update or create player", () => {
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

  it(`can update existing player`, async () => {
    const updateResponse = await request(app)
      .post("/graphql")
      .send({
        query: addOrUpdatePlayerMutation,
        variables: {
          playerId: player1Id,
          playerFieldsToUpdate: {
            name: "Jenny Appleseed",
            avatar: [{ id: "woman_apple_head" }],
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
      _id: player1Id,
      name: "Jenny Appleseed",
      avatar: [{ id: "woman_apple_head" }],
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app).post("/graphql").send({
      query: fetchPlayersQuery,
    });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          _id: player1Id,
          name: "Jenny Appleseed",
          avatar: [{ id: "woman_apple_head" }],
          description: "I want an avatar with an apple for a head",
        },
      },
    ]);
  });

  it(`can create new player`, async () => {
    const updateResponse = await request(app)
      .post("/graphql")
      .send({
        query: addOrUpdatePlayerMutation,
        variables: {
          playerId: "5f748650f4b3f1b9f2f2f1f9",
          playerFieldsToUpdate: {
            name: "Jenny Appleseed",
            avatar: [{ id: "woman_apple_head" }],
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
      _id: "5f748650f4b3f1b9f2f2f1f9",
      name: "Jenny Appleseed",
      avatar: [{ id: "woman_apple_head" }],
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app).post("/graphql").send({
      query: fetchPlayersQuery,
    });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          _id: "5f748650f4b3f1b9f2f2f1f9",
          name: "Jenny Appleseed",
          description: "I want an avatar with an apple for a head",
          avatar: [{ id: "woman_apple_head" }],
        },
      },
      {
        node: {
          _id: player1Id,
          name: "Jonny Appleseed",
          description: "I want an avatar with an apple for a head",
          avatar: [{ id: "man_apple_head" }],
        },
      },
    ]);
  });
});
