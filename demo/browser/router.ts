// The browser version is one page with four views. The app's own links (next/link) are
// pointed here by the build, so the same components switch views instead of loading routes.
export type Route = "chat" | "how-it-works" | "contacts" | "staff";

const PATHS: Record<Route, string> = { chat: "/", "how-it-works": "/how-it-works", contacts: "/contacts", staff: "/admin" };

export function routeFromHref(href: string): Route {
  if (href.startsWith("/how-it-works")) return "how-it-works";
  if (href.startsWith("/contacts")) return "contacts";
  if (href.startsWith("/admin")) return "staff";
  return "chat";
}

function initialRoute(): Route {
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash === "how-it-works" || hash === "contacts" || hash === "staff") return hash;
  } catch {
    /* no location in some previews */
  }
  return "chat";
}

let current: Route = initialRoute();
const listeners = new Set<() => void>();

export const getRoute = () => current;
export const pathOf = (route: Route) => PATHS[route];

export function navigate(route: Route) {
  if (route === current) return;
  current = route;
  try {
    window.history.replaceState(null, "", `#${route}`);
  } catch {
    /* the view still changes without the address */
  }
  listeners.forEach((listener) => listener());
  window.scrollTo({ top: 0 });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
