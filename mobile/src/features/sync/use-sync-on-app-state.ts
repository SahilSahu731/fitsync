import {
  useEffect,
  useRef,
} from "react";

import {
  AppState,
  type AppStateStatus,
} from "react-native";

import {
  useSQLiteContext,
} from "expo-sqlite";

import {
  useAuthStore,
} from "@/features/auth/store";

import {
  syncPendingWorkouts,
} from "./sync-engine";


export function useSyncOnAppState() {
  const database =
    useSQLiteContext();


  const user =
    useAuthStore(
      (
        state,
      ) =>
        state.user,
    );


  const stateRef =
    useRef<AppStateStatus>(
      AppState
        .currentState
    );


  useEffect(
    () => {
      const subscription =
        AppState
          .addEventListener(
            "change",

            (
              nextState,
            ) => {
              const previous =
                stateRef.current;


              stateRef.current =
                nextState;


              const resumed =
                previous !==
                  "active" &&
                nextState ===
                  "active";


              if (
                resumed &&
                user?.id
              ) {
                void syncPendingWorkouts(
                  database,
                  user.id,
                );
              }
            },
          );


      return () => {
        subscription
          .remove();
      };
    },
    [
      database,
      user?.id,
    ],
  );
}