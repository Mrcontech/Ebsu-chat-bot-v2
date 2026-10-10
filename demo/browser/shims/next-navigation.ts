// Stands in for next/navigation: the "path" is the current view.
import { useSyncExternalStore } from "react";
import { getRoute, pathOf, subscribe } from "../router";

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => pathOf(getRoute()), () => "/");
}
