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

  useEffect(() => {
    if (!preferences.data || mutation.isPending) {
      return;
    }

    const timezone = getDeviceTimezone();

    if (timezone === preferences.data.timezone) {
      return;
    }

    mutation.mutate({
      timezone,
    });
  }, [preferences.data, mutation.isPending]);

  return {
    preferences,

    updateTarget: (target: number) => {
      mutation.mutate({
        weekly_workout_target: target,
      });
    },

    updating: mutation.isPending,
  };
}
