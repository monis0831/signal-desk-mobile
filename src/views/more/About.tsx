import { useDesk } from "../../lib/store";
import { Screen } from "../../components/Screen";
import { ListSection, Row } from "../../components/List";
import { duration } from "../../lib/format";

const APP_VERSION = "1.0.0";

export function About({ onBack }: { onBack: () => void }) {
  const { state, pairing } = useDesk();

  return (
    <Screen title="About" onBack={onBack}>
      <ListSection label="This app">
        <Row title="Signal Desk Mobile" value={<span className="mono">{APP_VERSION}</span>} />
        <Row title="Paired engine" subtitle={pairing?.baseUrl} value={<span className="mono">{state?.version ?? "—"}</span>} />
        <Row title="Engine uptime" value={<span className="mono">{state ? duration(state.uptime * 1000) : "—"}</span>} />
      </ListSection>
      <ListSection label="Engine data" note="Where the engine's own config, logs and Telegram session live — on the machine running it, not on this phone.">
        <Row title="Data directory" subtitle={state?.data_dir} />
        <Row title="Log directory" subtitle={state?.log_dir} />
      </ListSection>
    </Screen>
  );
}
