export interface Reachability {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

export function isOffline(state: Reachability): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}
