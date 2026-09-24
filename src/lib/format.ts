/** Naira / Lagos display helpers shared by the dashboard. */

export function formatNaira(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Full ₦-prefixed amount for UI copy (never double-prefixes). */
export function formatNairaAmount(n: number): string {
  const body = formatNaira(n);
  return body === "—" ? body : `₦${body}`;
}

export function formatWat(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
