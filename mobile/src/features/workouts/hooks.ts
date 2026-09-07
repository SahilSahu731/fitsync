import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  router,
} from "expo-router";

import {
  startWorkout,
} from "./api";

import {
  workoutSessionKeys,
} from "./keys";


export function useStartWorkout() {
  const queryClient =
    useQueryClient();

  return useMutation({
    mutationFn:
      startWorkout,

    onSuccess:
      async (
        session,
      ) => {
        queryClient.setQueryData(
          workoutSessionKeys
            .active(),
          {
            workout:
              session,
          },
        );

        await queryClient
          .invalidateQueries({
            queryKey:
              workoutSessionKeys
                .all,
          });

        router.push(
          `/workouts/active/${session.id}`
        );
      },
  });
}