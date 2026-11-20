import { PlaceholderNote } from "./PlaceholderNote.tsx";
import { REPORT_STATUSES, SAMPLE_REPORTS, type ReportStatus } from "./samples.ts";

// My reports: will list the reports the user has sent, each with its report status. The real list is not built yet,
// so this placeholder screen shows two sample reports from the core-app prototype, and says plainly that they are
// samples. The placeholder is a suggestion: the real screen can look different.

// The report status as three bars, filled up to where the report stands. The bars are drawn for sighted users, and
// the visually hidden line says the same thing for screen readers.
function StatusTrack({ status }: { status: ReportStatus }) {
  const at = REPORT_STATUSES.indexOf(status);
  return (
    <div>
      <span className="visually-hidden">Report status: {status}</span>
      <div className="status-track" aria-hidden="true">
        {REPORT_STATUSES.map((name, i) => (
          <div key={name} className={i === at ? "now" : undefined}>
            <div className={i <= at ? "bar on" : "bar"} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MyReports() {
  return (
    <main className="screen">
      <div className="scroll">
        <h1 className="h-l">My reports</h1>
        <PlaceholderNote label="Placeholder screen">
          The real list of your reports is still to be built. These two are samples, not your reports, to show roughly
          what will go here.
        </PlaceholderNote>
        <ul className="report-list" aria-label="Sample reports">
          {SAMPLE_REPORTS.map((report) => (
            <li key={report.category} className="card pad report-card">
              <div className="stack">
                <div className="row-between">
                  <strong className="report-title">{report.category}</strong>
                  <span className="label">{report.when}</span>
                </div>
                <span className="small">
                  {report.location} · {report.responsibleParty}
                </span>
                <span className="label">Case number: [case number]</span>
              </div>
              <StatusTrack status={report.status} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
