// Sample content for placeholder screens and sections, from the core-app prototype (design/prototypes/core-app.html).
// None of it is real: it gives a feel for what could go there, and every place that shows it says so.

export const REPORT_STATUSES = ["Submitted", "Received", "Resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface SampleReport {
  category: string;
  location: string;
  responsibleParty: string;
  status: ReportStatus;
  when: string;
}

export const SAMPLE_REPORTS: SampleReport[] = [
  {
    category: "Broken streetlight",
    location: "Telegraph Ave & Dwight Way",
    responsibleParty: "Berkeley Public Works",
    status: "Received",
    when: "Nov 12",
  },
  {
    category: "Missing street sign",
    location: "Hearst Ave & Oxford St",
    responsibleParty: "Berkeley Public Works",
    status: "Resolved",
    when: "Oct 28",
  },
];

/** One line on where a report stands, in words a person would use. */
export function statusLine(report: SampleReport): string {
  switch (report.status) {
    case "Submitted":
      return `Sent to ${report.responsibleParty}. Waiting for them to receive it.`;
    case "Received":
      return `${report.responsibleParty} received it.`;
    case "Resolved":
      return `${report.responsibleParty} marked it fixed.`;
  }
}

export const SAMPLE_NEARBY = [
  { category: "Pothole", location: "Shattuck Ave & Rose St", people: 4, when: "2 days ago" },
  { category: "Damaged sidewalk", location: "Vine St & Walnut St", people: 2, when: "last week" },
];

export const SAMPLE_STILL_THERE = { category: "Graffiti", location: "Milvia St & Allston Way", when: "3 weeks ago" };
