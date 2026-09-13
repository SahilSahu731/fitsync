import * as Network from "expo-network";

export async function isInternetAvailable(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();

  return state.isConnected !== false && state.isInternetReachable !== false;
}
