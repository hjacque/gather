import {
  classifyReverification,
  Checkpoint,
  ItemPageState,
} from "./reverificationClassifier";

describe("classifyReverification", () => {
  describe("page-state → outcome", () => {
    it.each<[ItemPageState, Checkpoint]>([
      ["not-found", "7d"],
      ["not-found", "30d"],
      ["active", "7d"],
      ["active", "30d"],
    ])("invalidates a %s page at the %s check (terminal)", (state, checkpoint) => {
      expect(classifyReverification(state, checkpoint)).toEqual({
        status: "invalid",
        verificationStage: "complete",
      });
    });

    it("keeps a sold page pending at the 7-day check (never confirms)", () => {
      expect(classifyReverification("sold", "7d")).toEqual({
        status: "pending",
        verificationStage: "checked_7d",
      });
    });

    it("confirms a sold page at the 30-day check", () => {
      expect(classifyReverification("sold", "30d")).toEqual({
        status: "confirmed",
        verificationStage: "complete",
      });
    });
  });

  describe("lifecycle rule", () => {
    it("a sale still sold at 7d stays pending, then confirms at 30d", () => {
      const at7 = classifyReverification("sold", "7d");
      expect(at7.status).toBe("pending");
      expect(at7.verificationStage).toBe("checked_7d");

      const at30 = classifyReverification("sold", "30d");
      expect(at30.status).toBe("confirmed");
      expect(at30.verificationStage).toBe("complete");
    });

    it("the 7-day check can never confirm", () => {
      const outcomes: ItemPageState[] = ["sold", "active", "not-found"];
      for (const state of outcomes) {
        const { status } = classifyReverification(state, "7d");
        expect(status).not.toBe("confirmed");
      }
    });
  });
});
