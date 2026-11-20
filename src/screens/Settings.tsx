// Settings: FixFinder's own settings screen (the phone's settings are "the Settings app"). FixFinder has no settings
// yet, so this placeholder screen shows sample rows from the core-app prototype and says plainly that they do nothing.
// The rows are plain text, not buttons: a row that looks tappable and does nothing is a false signifier.

const SAMPLE_SETTINGS = [
  { name: "Reports are sent from", value: "[Your email or a FixFinder address]" },
  { name: "Location", value: "Asked when you report" },
  { name: "Appearance", value: "Matches your phone" },
];

export function Settings() {
  return (
    <main className="screen">
      <div className="scroll">
        <h1 className="h-l">Settings</h1>
        <div className="card pad stack placeholder-note" role="note" aria-label="Placeholder screen">
          <span className="chip">Placeholder screen</span>
          <span className="small">
            FixFinder has no settings yet. These rows are samples that show roughly what could go here, and they do
            nothing.
          </span>
        </div>
        <dl className="card settings-list" aria-label="Sample settings">
          {SAMPLE_SETTINGS.map((setting) => (
            <div key={setting.name} className="settings-row">
              <dt>{setting.name}</dt>
              <dd className="settings-value">{setting.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </main>
  );
}
