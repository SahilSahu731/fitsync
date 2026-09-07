import {
  Stack,
} from "expo-router";


export default function ExercisesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:
          false,

        contentStyle: {
          backgroundColor:
            "#080808",
        },
      }}
    />
  );
}