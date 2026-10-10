// Stands in for next/link: switches the page's view instead of loading a route.
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { navigate, routeFromHref } from "../router";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode; prefetch?: boolean };

export default function Link({ href, onClick, children, prefetch: _prefetch, ...rest }: Props) {
  const route = routeFromHref(href);
  return (
    <a
      {...rest}
      href={`#${route}`}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        navigate(route);
      }}
    >
      {children}
    </a>
  );
}
