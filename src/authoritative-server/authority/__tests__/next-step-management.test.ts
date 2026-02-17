/*
This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting: USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu

The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
*/

/// <reference types="jest" />
import * as pureStateModifiers from "../pure-state-modifiers";
import { updateRoomWithNextStep } from "../pure-state-modifiers";
import {
  Checking,
  NumericOperations,
} from "../../../schemas/models/DiscussionStage/types";
import {
  createMockDiscussionStage,
  createMockCurrentStage,
  createConditionalStep,
  createConditional,
  createSystemMessageStep,
  createBaseRoom,
} from "./helpers";

describe("next-step-management", () => {
  let updateRoomStageAndOrStepSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock updateRoomStageAndOrStep to return a room with updated values
    updateRoomStageAndOrStepSpy = jest
      .spyOn(pureStateModifiers, "updateRoomStageAndOrStep")
      .mockImplementation(async (room, stageId, stepId) => {
        const updatedRoom = { ...room };
        if (stageId) {
          updatedRoom.gameData.globalStateData.curStageId = stageId;
        }
        if (stepId) {
          updatedRoom.gameData.globalStateData.curStepId = stepId;
        }
        return updatedRoom;
      });
  });

  afterEach(() => {
    updateRoomStageAndOrStepSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("updateRoomWithNextStep", () => {
    it("should move to next stage and reset to first step when curStep.lastStep is true", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "last-step";
      room.gameData.globalStateData.discussionData = {};

      // Create a stage with a flow containing steps
      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
            createSystemMessageStep("last-step", { lastStep: true }),
          ],
        },
      ]);

      const nextStage = createMockDiscussionStage([
        {
          name: "Next Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2", { lastStep: true }),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage, nextStage);
      const curStep = createSystemMessageStep("last-step", { lastStep: true });

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Verify updateRoomStageAndOrStep was called with correct parameters
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledWith(
        room,
        nextStage.clientId,
        nextStage.flowsList[0].steps[0].stepId
      );
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledTimes(1);

      // Should move to next stage
      expect(result.gameData.globalStateData.curStageId).toBe(
        nextStage.clientId
      );
      // Should reset to first step of the stage (based on getFirstStepId which returns flowsList[0].steps[0].stepId)
      expect(result.gameData.globalStateData.curStepId).toBe(
        nextStage.flowsList[0].steps[0].stepId
      );
      // Should have called getNextStage
      expect(curStage.getNextStage({})).toBe(nextStage);
    });

    it("should use jumpToStepId when present (non-conditional, non-lastStep)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "step-with-jump";
      room.gameData.globalStateData.discussionData = {};

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-with-jump", {
              jumpToStepId: "target-step",
            }),
            createSystemMessageStep("step-2"),
            createSystemMessageStep("target-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("step-with-jump", {
        jumpToStepId: "target-step",
      });

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Verify updateRoomStageAndOrStep was called with undefined stageId and target stepId
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledWith(
        room,
        undefined,
        "target-step"
      );
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledTimes(1);

      // Should jump to the target step
      expect(result.gameData.globalStateData.curStepId).toBe("target-step");
      // Stage should remain the same
      expect(result.gameData.globalStateData.curStageId).toBe("current-stage");
    });

    it("should handle CONDITIONAL step with VALUE checking (string comparison)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        userChoice: "option1",
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "userChoice",
                Checking.VALUE,
                NumericOperations.EQUALS,
                "option1",
                "target-step-1"
              ),
              createConditional(
                "userChoice",
                Checking.VALUE,
                NumericOperations.EQUALS,
                "option2",
                "target-step-2"
              ),
            ]),
            createSystemMessageStep("target-step-1"),
            createSystemMessageStep("target-step-2"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "userChoice",
          Checking.VALUE,
          NumericOperations.EQUALS,
          "option1",
          "target-step-1"
        ),
        createConditional(
          "userChoice",
          Checking.VALUE,
          NumericOperations.EQUALS,
          "option2",
          "target-step-2"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Verify the conditional logic chose the correct step
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledWith(
        room,
        undefined,
        "target-step-1"
      );
      expect(updateRoomStageAndOrStepSpy).toHaveBeenCalledTimes(1);

      expect(result.gameData.globalStateData.curStepId).toBe("target-step-1");
    });

    it("should handle CONDITIONAL step with VALUE checking (numeric comparison)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        score: 95,
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "score",
                Checking.VALUE,
                NumericOperations.GREATER_THAN,
                "80",
                "high-score-step"
              ),
              createConditional(
                "score",
                Checking.VALUE,
                NumericOperations.GREATER_THAN,
                "50",
                "medium-score-step"
              ),
            ]),
            createSystemMessageStep("high-score-step"),
            createSystemMessageStep("medium-score-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "score",
          Checking.VALUE,
          NumericOperations.GREATER_THAN,
          "80",
          "high-score-step"
        ),
        createConditional(
          "score",
          Checking.VALUE,
          NumericOperations.GREATER_THAN,
          "50",
          "medium-score-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe("high-score-step");
    });

    it("should handle CONDITIONAL step with VALUE checking (boolean conversion)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        isComplete: "true",
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "isComplete",
                Checking.VALUE,
                NumericOperations.EQUALS,
                "true",
                "completed-step"
              ),
            ]),
            createSystemMessageStep("completed-step"),
            createSystemMessageStep("not-completed-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "isComplete",
          Checking.VALUE,
          NumericOperations.EQUALS,
          "true",
          "completed-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe("completed-step");
    });

    it("should handle CONDITIONAL step with LENGTH checking (array)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        items: ["item1", "item2", "item3", "item4"],
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "items",
                Checking.LENGTH,
                NumericOperations.GREATER_THAN_EQUALS,
                "3",
                "many-items-step"
              ),
              createConditional(
                "items",
                Checking.LENGTH,
                NumericOperations.GREATER_THAN,
                "0",
                "some-items-step"
              ),
            ]),
            createSystemMessageStep("many-items-step"),
            createSystemMessageStep("some-items-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "items",
          Checking.LENGTH,
          NumericOperations.GREATER_THAN_EQUALS,
          "3",
          "many-items-step"
        ),
        createConditional(
          "items",
          Checking.LENGTH,
          NumericOperations.GREATER_THAN,
          "0",
          "some-items-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe("many-items-step");
    });

    it("should handle CONDITIONAL step with LENGTH checking (string)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        answer: "This is a long answer with more than 10 characters",
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "answer",
                Checking.LENGTH,
                NumericOperations.GREATER_THAN,
                "10",
                "long-answer-step"
              ),
              createConditional(
                "answer",
                Checking.LENGTH,
                NumericOperations.GREATER_THAN,
                "0",
                "short-answer-step"
              ),
            ]),
            createSystemMessageStep("long-answer-step"),
            createSystemMessageStep("short-answer-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "answer",
          Checking.LENGTH,
          NumericOperations.GREATER_THAN,
          "10",
          "long-answer-step"
        ),
        createConditional(
          "answer",
          Checking.LENGTH,
          NumericOperations.GREATER_THAN,
          "0",
          "short-answer-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe(
        "long-answer-step"
      );
    });

    it("should handle CONDITIONAL step with CONTAINS checking (array)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        selectedOptions: ["premium", "feature1", "feature2"],
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "selectedOptions",
                Checking.CONTAINS,
                NumericOperations.EQUALS,
                "premium",
                "premium-step"
              ),
              createConditional(
                "selectedOptions",
                Checking.CONTAINS,
                NumericOperations.EQUALS,
                "basic",
                "basic-step"
              ),
            ]),
            createSystemMessageStep("premium-step"),
            createSystemMessageStep("basic-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "selectedOptions",
          Checking.CONTAINS,
          NumericOperations.EQUALS,
          "premium",
          "premium-step"
        ),
        createConditional(
          "selectedOptions",
          Checking.CONTAINS,
          NumericOperations.EQUALS,
          "basic",
          "basic-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe("premium-step");
    });

    it("should handle CONDITIONAL step with CONTAINS checking (string)", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        feedback: "The service was excellent and very helpful",
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "feedback",
                Checking.CONTAINS,
                NumericOperations.EQUALS,
                "excellent",
                "positive-step"
              ),
              createConditional(
                "feedback",
                Checking.CONTAINS,
                NumericOperations.EQUALS,
                "poor",
                "negative-step"
              ),
            ]),
            createSystemMessageStep("positive-step"),
            createSystemMessageStep("negative-step"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "feedback",
          Checking.CONTAINS,
          NumericOperations.EQUALS,
          "excellent",
          "positive-step"
        ),
        createConditional(
          "feedback",
          Checking.CONTAINS,
          NumericOperations.EQUALS,
          "poor",
          "negative-step"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      expect(result.gameData.globalStateData.curStepId).toBe("positive-step");
    });

    it("should return first matching conditional when multiple conditions exist", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "conditional-step";
      room.gameData.globalStateData.discussionData = {
        value: 10,
      };

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createConditionalStep("conditional-step", [
              createConditional(
                "value",
                Checking.VALUE,
                NumericOperations.GREATER_THAN,
                "5",
                "first-match"
              ),
              createConditional(
                "value",
                Checking.VALUE,
                NumericOperations.GREATER_THAN,
                "3",
                "second-match"
              ),
              createConditional(
                "value",
                Checking.VALUE,
                NumericOperations.GREATER_THAN,
                "1",
                "third-match"
              ),
            ]),
            createSystemMessageStep("first-match"),
            createSystemMessageStep("second-match"),
            createSystemMessageStep("third-match"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createConditionalStep("conditional-step", [
        createConditional(
          "value",
          Checking.VALUE,
          NumericOperations.GREATER_THAN,
          "5",
          "first-match"
        ),
        createConditional(
          "value",
          Checking.VALUE,
          NumericOperations.GREATER_THAN,
          "3",
          "second-match"
        ),
        createConditional(
          "value",
          Checking.VALUE,
          NumericOperations.GREATER_THAN,
          "1",
          "third-match"
        ),
      ]);

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Should match the first condition even though all three would be true
      expect(result.gameData.globalStateData.curStepId).toBe("first-match");
    });

    it("should move to next sequential step in flow when no special conditions", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "step-2";
      room.gameData.globalStateData.discussionData = {};

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
            createSystemMessageStep("step-3"),
            createSystemMessageStep("step-4"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("step-2");

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Should move to the next step in sequence
      expect(result.gameData.globalStateData.curStepId).toBe("step-3");
      expect(result.gameData.globalStateData.curStageId).toBe("current-stage");
    });

    it("should throw error when flow not found for current step", () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "nonexistent-step";
      room.gameData.globalStateData.discussionData = {};

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("nonexistent-step");

      expect(() => {
        updateRoomWithNextStep(room, curStage, curStep);
      }).toThrow("Unable to find flow for step: nonexistent-step");
    });

    it("should throw error when current step not found in flow", () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "missing-step";
      room.gameData.globalStateData.discussionData = {};

      // Create a flow but the step won't be in it
      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("missing-step");

      expect(() => {
        updateRoomWithNextStep(room, curStage, curStep);
      }).toThrow("Unable to find flow for step: missing-step");
    });

    it("should throw error when at end of flow with no next step", () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "last-step-no-jump";
      room.gameData.globalStateData.discussionData = {};

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
            createSystemMessageStep("last-step-no-jump"), // Last step without jumpToStepId or lastStep flag
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("last-step-no-jump");

      expect(() => {
        updateRoomWithNextStep(room, curStage, curStep);
      }).toThrow("No next step found");
    });

    it("should not mutate the original gameData object", async () => {
      const room = createBaseRoom();
      room.gameData.globalStateData.curStageId = "current-stage";
      room.gameData.globalStateData.curStepId = "step-1";
      room.gameData.globalStateData.discussionData = {};

      const originalStageId = room.gameData.globalStateData.curStageId;
      const originalStepId = room.gameData.globalStateData.curStepId;

      const stage = createMockDiscussionStage([
        {
          name: "Main Flow",
          steps: [
            createSystemMessageStep("step-1"),
            createSystemMessageStep("step-2"),
          ],
        },
      ]);

      const curStage = createMockCurrentStage(stage);
      const curStep = createSystemMessageStep("step-1");

      const result = await updateRoomWithNextStep(room, curStage, curStep);

      // Result should have changed
      expect(result.gameData.globalStateData.curStepId).toBe("step-2");

      // Original should remain unchanged
      expect(room.gameData.globalStateData.curStageId).toBe(originalStageId);
      expect(room.gameData.globalStateData.curStepId).toBe(originalStepId);
    });
  });
});
