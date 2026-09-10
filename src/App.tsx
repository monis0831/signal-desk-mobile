/**
 * App.tsx — shell composition and the one piece of top-level routing state.
 *
 * Five tabs, no URLs: PRODUCT.md's navigation is fixed (Home, Positions,
 * Signals, Channels, More), there's nothing to deep-link to on someone
 * else's phone, and a router here would be ceremony for a state machine
 * this small — the same reasoning the desktop app's own App.tsx gives for
 * skipping one.
 */

import { useState } from "react";
import { useDesk } from "./lib/store";
import { TabBar, Rail, type TabId } from "./components/Nav";
import { ToastHost } from "./components/ToastHost";
import { AuthPromptSheet } from "./components/AuthPromptSheet";
import { PairingSheet } from "./views/PairingSheet";
import { Home } from "./views/Home";
import { Positions } from "./views/Positions";
import { Signals } from "./views/Signals";
import { Channels } from "./views/Channels";
import { More } from "./views/More";

export default function App() {
  const { status } = useDesk();
  const [tab, setTab] = useState<TabId>("home");

  if (status === "unpaired") {
    return (
      <div className="app-shell">
        <div className="app-main" />
        <PairingSheet open onClose={() => undefined} dismissable={false} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="rail-slot">
        <Rail current={tab} onNavigate={setTab} />
      </div>
      <div className="app-main">
        <View id={tab} onNavigate={setTab} />
      </div>
      <div className="tabbar-slot">
        <TabBar current={tab} onNavigate={setTab} />
      </div>
      <AuthPromptSheet />
      <ToastHost />
    </div>
  );
}

function View({ id, onNavigate }: { id: TabId; onNavigate: (next: TabId) => void }) {
  switch (id) {
    case "home":
      return <Home onNavigate={onNavigate} />;
    case "positions":
      return <Positions />;
    case "signals":
      return <Signals />;
    case "channels":
      return <Channels />;
    case "more":
      return <More />;
    default: {
      const exhaustive: never = id;
      return <>{String(exhaustive)}</>;
    }
  }
}
