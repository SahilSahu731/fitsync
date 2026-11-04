import { router as expoRouter } from "expo-router";

import type {
  ExploreCard,
  ExploreDestination
} from "./api";

export const EXPLORE_LABELS: Record<
  ExploreDestination,
  string
> = {
  workouts: "Workouts",
  programs: "Programs",
  exercises: "Exercises",
  mobility: "Mobility & recovery",
  learn: "Learn",
  tools: "Fitness tools"
};

export function openExploreCard(
  router: typeof expoRouter,
  card: ExploreCard
) {
  switch (card.section) {
    case "workouts":
      return router.push({
        pathname: "/explore/routines/[id]",
        params: { id: card.id }
      });

    case "programs":
      return router.push({
        pathname: "/explore/programs/[id]",
        params: { id: card.id }
      });

    case "exercises":
      return router.push({
        pathname: "/exercise/[id]",
        params: { id: card.id }
      });

    case "mobility":
    case "learn":
      return router.push({
        pathname: "/explore/resources/[slug]",
        params: { slug: card.slug }
      });
  }
}

export function openExploreSection(
  router: typeof expoRouter,
  section: ExploreDestination
) {
  if (section === "exercises") {
    return router.push("/explore/exercises");
  }

  if (section === "tools") {
    return router.push("/explore/tools");
  }

  return router.push({
    pathname: "/explore/browse/[section]",
    params: { section }
  });
}