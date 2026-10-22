import assert from "node:assert/strict";
import test from "node:test";
import { imageUrls, normalize, type SourceExercise } from "../scripts/lib/free-exercise-source.js";
const example: SourceExercise = { id: "Dumbbell_Curl", name: "Dumbbell Curl", category: "strength", level: "beginner", force: "pull", equipment: "dumbbell", primaryMuscles: ["biceps"], secondaryMuscles: ["forearms"], instructions: ["Curl with control."], images: ["Dumbbell_Curl/0.jpg", "Dumbbell_Curl/1.jpg"] };
test("imports source images with safe canonical URLs and de-duplicates paths", () => {
  const urls = imageUrls({ ...example, images: [...example.images!, example.images![0]] });
  assert.equal(urls.length, 2);
  assert.equal(urls[0], "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Curl/0.jpg");
});
test("source image paths cannot redirect downloads outside the dataset", () => {
  for (const image of ["https://evil.example/image.jpg", "../../secret.jpg", "Exercise/../0.jpg", "Exercise/0.jpg?redirect=evil"]) assert.throws(() => imageUrls({ ...example, images: [image] }), /Invalid source image path/);
});
test("normalization retains review status and compatible classifications", () => {
  const input = normalize(example)!;
  assert.equal(input.status, "draft");
  assert.deepEqual(input.primaryMuscles, ["biceps"]);
  assert.equal(input.slug, "dumbbell-curl");
  assert.equal(normalize({ ...example, primaryMuscles: ["unrecognized"] }), null);
});
