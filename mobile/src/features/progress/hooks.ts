import { getCalendars } from "expo-localization";

import { useEffect } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateProgressPreferences } from "./api";

import { progressKeys } from "./keys";

import { useProgressPreferences } from "./queries";

function getDeviceTimezone(): string {
  const calendar = getCalendars()[0];

  if (calendar?.timeZone) {
    return calendar.timeZone;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function useSyncProgressTimezone() {
  const queryClient = useQueryClient();

  const preferences = useProgressPreferences();

  const mutation = useMutation({
    mutationFn: updateProgressPreferences,

    onSuccess: (result) => {
      queryClient.setQueryData(progressKeys.preferences(), result);

      void queryClient.invalidateQueries({
        queryKey: progressKeys.all,
      });
    },
  });

  const { isPending, mutate } = mutation;

  useEffect(() => {
    if (!preferences.data || isPending) {
      return;
    }

    const timezone = getDeviceTimezone();

    if (timezone === preferences.data.timezone) {
      return;
    }

    mutate({
      timezone,
    });
  }, [preferences.data, isPending, mutate]);

  return {
    preferences,

    updateTarget: (target: number) => {
      mutate({
        weekly_workout_target: target,
      });
    },

    updating: isPending,
  };
}
