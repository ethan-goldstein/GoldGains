import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconToday = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H12z" fill="currentColor" stroke="none" opacity="0.9" />
  </Svg>
);
export const IconProgress = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Svg>
);
export const IconDumbbell = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />
  </Svg>
);
export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IconChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);
export const IconChevronDown = (p: P) => (
  <Svg {...p}>
    <path d="M5 9l7 7 7-7" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
);
export const IconBarcode = (p: P) => (
  <Svg {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 8v8M10 8v8M13 8v8M16.5 8v8" />
  </Svg>
);
export const IconLabel = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 7h8M8 10.5h8M8 14h5M8 17.5h6" />
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </Svg>
);
export const IconImage = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M20.5 16l-5-5-8.5 8.5" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Svg>
);
export const IconStar = ({ filled, ...p }: P & { filled?: boolean }) => (
  <Svg {...p}>
    <path
      d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
);
export const IconFlame = (p: P) => (
  <Svg {...p}>
    <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.3 3.6-7.6.4 1.6 1.2 2.6 2.2 3.2.2-2.9 1.6-5.4 3.7-6.9-.3 2.8.9 4.5 2.2 6.1 1.1 1.4 1.3 2.6 1.3 4.2 0 4-2.6 7.2-6.5 7.2z" />
  </Svg>
);
export const IconDrop = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
  </Svg>
);
export const IconCopy = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Svg>
);
export const IconMore = (p: P) => (
  <Svg {...p}>
    <circle cx="5.5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="18.5" cy="12" r="1.3" fill="currentColor" />
  </Svg>
);
export const IconCalendar = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);
export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" />
  </Svg>
);
export const IconScale = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <path d="M8.5 9.5a5 5 0 0 1 7 0M12 9.5l1.4-2" />
  </Svg>
);
export const IconTorch = (p: P) => (
  <Svg {...p}>
    <path d="M8 3h8l-1 5H9zM9 8l1 13h4l1-13M12 12v3" />
  </Svg>
);
export const IconTrophy = (p: P) => (
  <Svg {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M9.5 17h5v3.5h-5z" />
  </Svg>
);
export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.5v.5" />
  </Svg>
);
export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v11M8 7.5l4-4 4 4M5.5 12.5v5.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5.5" />
  </Svg>
);
export const IconUpload = (p: P) => (
  <Svg {...p}>
    <path d="M12 15.5v-11M8 8.5l4-4 4 4M4.5 15v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
  </Svg>
);
export const IconWarn = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l9 15.5H3zM12 10v4.5M12 17v.3" />
  </Svg>
);
export const IconUtensils = (p: P) => (
  <Svg {...p}>
    <path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17" />
  </Svg>
);
export const IconTimer = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="13.5" r="7.5" />
    <path d="M12 9.5v4l2.5 1.5M9.5 2.5h5" />
  </Svg>
);
