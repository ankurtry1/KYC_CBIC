"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import type { Route } from "next";
import { markProfileNavigationStart } from "@/lib/officers/perf";
import { cn } from "@/lib/utils/cn";

type ProfileLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: Route;
  officerId: string;
  children: ReactNode;
  statusLabel?: string;
  pendingLabel?: string;
  statusClassName?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function ProfileLink({
  href,
  officerId,
  children,
  className,
  statusLabel,
  pendingLabel = "Opening profile…",
  statusClassName,
  onClick,
  prefetch,
  onMouseEnter,
  onFocus,
  ...rest
}: ProfileLinkProps): JSX.Element {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  function prefetchProfile(): void {
    router.prefetch(href);
  }

  return (
    <Link
      {...rest}
      href={href}
      prefetch={prefetch ?? true}
      className={cn(className, isNavigating ? "opacity-90" : "")}
      data-navigation-pending={isNavigating ? "true" : "false"}
      onMouseEnter={(event) => {
        prefetchProfile();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetchProfile();
        onFocus?.(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        markProfileNavigationStart(officerId);
        setIsNavigating(true);
      }}
    >
      {children}
      {statusLabel ? (
        <span className={cn(statusClassName, isNavigating ? "opacity-100" : "")}>
          {isNavigating ? pendingLabel : statusLabel}
        </span>
      ) : null}
    </Link>
  );
}
