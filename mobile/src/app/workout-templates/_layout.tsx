import {
  Stack,
} from "expo-router";


export default function WorkoutTemplatesLayout() {
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