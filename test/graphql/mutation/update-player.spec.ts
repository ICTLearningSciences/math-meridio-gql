/*

*/
import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";

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
        query: `
        mutation AddOrUpdatePlayer($player: PlayerInput!) {
          addOrUpdatePlayer(player: $player) {
            clientId
            name
            description
            avatar {
              id
            }
          }
        }`,
        variables: {
          player: {
            clientId: "Player 1",
            name: "Jenny Appleseed",
            avatar: [{ id: "woman_apple_head" }],
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
      clientId: "Player 1",
      name: "Jenny Appleseed",
      avatar: [{ id: "woman_apple_head" }],
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app)
      .post("/graphql")
      .send({
        query: `query {
        fetchPlayers {
          edges {
            node {
              clientId
              name
              description
              avatar {
                id
              }
            }
          }
        }
      }`,
      });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          clientId: "Player 1",
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
        query: `
        mutation AddOrUpdatePlayer($player: PlayerInput!) {
          addOrUpdatePlayer(player: $player) {
            clientId
            name
            description
            avatar {
              id
            }
          }
        }`,
        variables: {
          player: {
            clientId: "Player 2",
            name: "Jenny Appleseed",
            avatar: [{ id: "woman_apple_head" }],
            description: "I want an avatar with an apple for a head",
          },
        },
      });
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.body.data.addOrUpdatePlayer).to.eql({
      clientId: "Player 2",
      name: "Jenny Appleseed",
      avatar: [{ id: "woman_apple_head" }],
      description: "I want an avatar with an apple for a head",
    });

    const fetchResponse = await request(app)
      .post("/graphql")
      .send({
        query: `query {
        fetchPlayers {
          edges {
            node {
              clientId
              name
              description
              avatar {
                id
              }
            }
          }
        }
      }`,
      });
    expect(fetchResponse.status).to.equal(200);
    expect(fetchResponse.body.data.fetchPlayers.edges).to.eql([
      {
        node: {
          clientId: "Player 2",
          name: "Jenny Appleseed",
          description: "I want an avatar with an apple for a head",
          avatar: [{ id: "woman_apple_head" }],
        },
      },
      {
        node: {
          clientId: "Player 1",
          name: "Jonny Appleseed",
          description: "I want an avatar with an apple for a head",
          avatar: [{ id: "man_apple_head" }],
        },
      },
    ]);
  });
});
