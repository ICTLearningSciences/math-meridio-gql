/*

*/
import createApp, { appStart, appStop } from "../../../src/app";
import { expect } from "chai";
import e, { Express } from "express";
import mongoUnit from "mongo-unit";
import request from "supertest";

describe("fetch players", () => {
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

  it(`can fetch existing players`, async () => {
    const response = await request(app)
      .post("/graphql")
      .send({
        query: `query {
          fetchPlayers {
            edges {
              node {
                _id
                clientId
                name
                description
                avatar {
                  id
                }
                chatAvatar {
                  id
                }
              }
            }
          }
        }`,
      });
    expect(response.status).to.equal(200);
    expect(response.body.data.fetchPlayers.edges).to.deep.include.members([
      {
        node: {
          _id: "5f748650f4b3f1b9f1f1f1f1",
          clientId: "1",
          name: "Jonny Appleseed",
          description: "I want an avatar with an apple for a head",
          avatar: [{ id: "man_apple_head" }],
          chatAvatar: [{ id: "man_apple_head" }],
        },
      },
    ]);
  });
});
