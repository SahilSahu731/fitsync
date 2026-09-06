import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,

        contentStyle: {
          backgroundColor: "#080808",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          animation: "fade",
        }}
      />

      <Stack.Screen
        name="email"
        options={{
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="verify"
        options={{
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}
