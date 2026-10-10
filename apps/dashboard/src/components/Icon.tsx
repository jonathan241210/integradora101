import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "animals"
  | "bell"
  | "building"
  | "calendar"
  | "check"
  | "chevron"
  | "close"
  | "dashboard"
  | "dots"
  | "enter"
  | "menu"
  | "minus"
  | "news"
  | "plus"
  | "search"
  | "ticket"
  | "trend"
  | "users";

const iconPaths: Record<IconName, ReactNode> = {
  animals: <><circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="4" cy="13" r="2" /><circle cx="20" cy="13" r="2" /><path d="M12 12c-3.3 0-6 3.1-6 6.2 0 1.6 1.2 2.8 2.7 2.8.9 0 2.1-.6 3.3-.6s2.4.6 3.3.6c1.5 0 2.7-1.2 2.7-2.8C18 15.1 15.3 12 12 12Z" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  building: <><path d="M4 21V5l8-3 8 3v16" /><path d="M2 21h20M8 8h1m6 0h1M8 12h1m6 0h1M10 21v-5h4v5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m7 10 5 5 5-5" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" /></>,
  dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  enter: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  minus: <path d="M5 12h14" />,
  news: <><path d="M5 4h14a2 2 0 0 1 2 2v14H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" /><path d="M7 8h10M7 12h10M7 16h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  ticket: <><path d="M3 8a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 1 0-4V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2Z" /><path d="M13 5v2m0 3v2m0 3v2" /></>,
  trend: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Zm13-9a3 3 0 1 0-1-5.8M18 14a5 5 0 0 1 3 5v1h-3" /></>,
};

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
