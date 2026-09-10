/**
 * Nav.tsx — the bottom tab bar (phone / iPad portrait) and the left rail it
 * becomes in iPad landscape. DESIGN.md is exact about the five destinations
 * and that nothing else changes between the two layouts.
 */

export type TabId = "home" | "positions" | "signals" | "channels" | "more";

export const TABS: { id: TabId; label: string; icon: (active: boolean) => JSX.Element }[] = [
  { id: "home", label: "Home", icon: (a) => <IconHome active={a} /> },
  { id: "positions", label: "Positions", icon: (a) => <IconPositions active={a} /> },
  { id: "signals", label: "Signals", icon: (a) => <IconSignals active={a} /> },
  { id: "channels", label: "Channels", icon: (a) => <IconChannels active={a} /> },
  { id: "more", label: "More", icon: (a) => <IconMore active={a} /> },
];

export function TabBar({
  current,
  onNavigate,
  badges,
}: {
  current: TabId;
  onNavigate: (id: TabId) => void;
  badges?: Partial<Record<TabId, boolean>>;
}) {
  return (
    <nav className="tabbar" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === current ? "active" : undefined}
          onClick={() => onNavigate(tab.id)}
          aria-current={tab.id === current ? "page" : undefined}
        >
          {tab.icon(tab.id === current)}
          {tab.label}
          {badges?.[tab.id] ? <span className="tab-badge" aria-hidden="true" /> : null}
        </button>
      ))}
    </nav>
  );
}

export function Rail({
  current,
  onNavigate,
}: {
  current: TabId;
  onNavigate: (id: TabId) => void;
}) {
  return (
    <nav className="rail" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === current ? "active" : undefined}
          onClick={() => onNavigate(tab.id)}
          aria-current={tab.id === current ? "page" : undefined}
        >
          {tab.icon(tab.id === current)}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/* ---- icons — plain inline SVG, no dependency ---------------------------- */

function IconHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 11L12 4L20 11V20H14V14H10V20H4V11Z" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinejoin="round" fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}
function IconPositions({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17L9 10L13 14L20 5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 5H20V11" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconSignals({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12H7L9.5 5L14 19L16.5 12H21" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconChannels({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.4" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} fill={active ? "currentColor" : "none"} />
      <path d="M6.5 8.5C4 11 4 13 6.5 15.5M17.5 8.5C20 11 20 13 17.5 15.5" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" />
    </svg>
  );
}
function IconMore({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="12" r={active ? 1.8 : 1.5} fill="currentColor" />
      <circle cx="12" cy="12" r={active ? 1.8 : 1.5} fill="currentColor" />
      <circle cx="19" cy="12" r={active ? 1.8 : 1.5} fill="currentColor" />
    </svg>
  );
}
