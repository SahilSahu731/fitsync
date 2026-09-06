import { QueryClientProvider } from "@tanstack/react-query";

import type { PropsWithChildren } from "react";

import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";

import { queryClient } from "@/lib/query/query-client";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );
}
