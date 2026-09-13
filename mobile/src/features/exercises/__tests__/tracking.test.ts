import {
  usesDistance,
  usesDuration,
  usesReps,
  usesWeight,
  weightLabel,
} from "../tracking";

describe("exercise tracking capabilities", () => {
  it("maps each tracking mode to its supported metrics and labels", () => {
    expect(usesWeight("WEIGHT_REPS")).toBe(true);

    expect(usesWeight("DURATION")).toBe(false);

    expect(usesDuration("DISTANCE_DURATION")).toBe(true);

    expect(usesDistance("WEIGHT_DISTANCE")).toBe(true);

    expect(usesReps("REPS_ONLY")).toBe(true);

    expect(weightLabel("ASSISTED_REPS", "KG")).toBe("Assist");
  });
});
