/** Naira / Lagos display helpers shared by the dashboard. */

export function formatNaira(n: number): string {
  return n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatWat(ms: number): string {
  return new Date(ms).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
