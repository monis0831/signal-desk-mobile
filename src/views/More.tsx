/**
 * More — the hub for everything that isn't Home/Positions/Signals/Channels:
 * pairing, connections, trading risk settings, symbol map, reporting, and
 * history. Manages its own push navigation rather than lifting it to App,
 * since nothing outside this tab needs to jump into one of its sub-screens.
 */

import { useState } from "react";
import { useDesk } from "../lib/store";
import { Screen } from "../components/Screen";
import { ListSection, Row } from "../components/List";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { PairingSheet } from "./PairingSheet";
import { Connections } from "./more/Connections";
import { Trading } from "./more/Trading";
import { SymbolMap } from "./more/SymbolMap";
import { Reporting } from "./more/Reporting";
import { History } from "./more/History";
import { About } from "./more/About";
import { TelegramChannels } from "./more/TelegramChannels";

type Section =
  | "connections" | "trading" | "symbols" | "reporting"
  | "history" | "about" | "telegram";

export function More() {
  const { pairing, unpair } = useDesk();
  const [section, setSection] = useState<Section | null>(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [confirmUnpair, setConfirmUnpair] = useState(false);

  if (section === "connections") return <Connections onBack={() => setSection(null)} />;
  if (section === "telegram") return <TelegramChannels onBack={() => setSection(null)} />;
  if (section === "trading") return <Trading onBack={() => setSection(null)} />;
  if (section === "symbols") return <SymbolMap onBack={() => setSection(null)} />;
  if (section === "reporting") return <Reporting onBack={() => setSection(null)} />;
  if (section === "history") return <History onBack={() => setSection(null)} />;
  if (section === "about") return <About onBack={() => setSection(null)} />;

  return (
    <Screen title="More">
      <ListSection label="Engine">
        <Row title="Connections" subtitle="MetaTrader 5 and Telegram" onClick={() => setSection("connections")} chevron />
        <Row title="Telegram channels" subtitle="Everything this account has joined" onClick={() => setSection("telegram")} chevron />
        <Row title="Trading" subtitle="Lot size, open-trade limit, entry handling" onClick={() => setSection("trading")} chevron />
        <Row title="Symbol map" onClick={() => setSection("symbols")} chevron />
        <Row title="Reporting" subtitle="Post results to Telegram" onClick={() => setSection("reporting")} chevron />
        <Row title="History" subtitle="Closed trades and performance" onClick={() => setSection("history")} chevron />
      </ListSection>

      <ListSection label="Pairing" note={pairing ? pairing.baseUrl : "Not paired"}>
        <Row title="Re-pair with engine" onClick={() => setPairingOpen(true)} chevron />
        <Row title="Forget this engine" onClick={() => setConfirmUnpair(true)} chevron />
      </ListSection>

      <ListSection label="App">
        <Row title="About" onClick={() => setSection("about")} chevron />
      </ListSection>

      <PairingSheet open={pairingOpen} onClose={() => setPairingOpen(false)} />
      <ConfirmSheet
        open={confirmUnpair}
        onClose={() => setConfirmUnpair(false)}
        title="Forget this engine?"
        confirmLabel="Forget"
        consequence="This app forgets the saved address and token. Nothing changes on the engine itself — you'll need to pair again to use this app."
        onConfirm={() => {
          unpair();
          setConfirmUnpair(false);
        }}
      />
    </Screen>
  );
}
