import { formatExerciseDuration, parseExerciseDuration } from "../duration";

describe("duration helpers", () => {
  it("parses seconds", () => {
    expect(parseExerciseDuration("45")).toBe(45);
  });

  it("parses mm:ss", () => {
    expect(parseExerciseDuration("1:30")).toBe(90);
  });

  it("formats seconds", () => {
    expect(formatExerciseDuration(90)).toBe("1:30");
  });
});
