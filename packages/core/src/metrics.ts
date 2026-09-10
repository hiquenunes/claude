// Deterministic ad-metrics math (section 13 of the briefing). Exposed as an
// MCP tool so Claude computes these in code instead of doing arithmetic in
// the chat turn — same numbers every time, and zero-denominator cases come
// back as an explained "unavailable", never Infinity or a guess.

export type MetricResult = { value: number } | { unavailable: true; reason: string };

export function safeDivide(numerator: number, denominator: number): MetricResult {
  if (!Number.isFinite(denominator) || denominator === 0) {
    return { unavailable: true, reason: "denominador zero ou inválido" };
  }
  if (!Number.isFinite(numerator)) {
    return { unavailable: true, reason: "numerador inválido" };
  }
  return { value: numerator / denominator };
}

function scale(result: MetricResult, factor: number): MetricResult {
  return "value" in result ? { value: result.value * factor } : result;
}

/** CPM = investimento / impressões × 1000 */
export function cpm(spend: number, impressions: number): MetricResult {
  return scale(safeDivide(spend, impressions), 1000);
}

/** CTR de link = cliques no link / impressões × 100 */
export function ctrLink(linkClicks: number, impressions: number): MetricResult {
  return scale(safeDivide(linkClicks, impressions), 100);
}

/** CPC de link = investimento / cliques no link */
export function cpcLink(spend: number, linkClicks: number): MetricResult {
  return safeDivide(spend, linkClicks);
}

/** CPL = investimento / leads */
export function cpl(spend: number, leads: number): MetricResult {
  return safeDivide(spend, leads);
}

/** Visualizações de página / cliques no link — só usar quando fonte e escopo forem compatíveis. */
export function pageViewToLinkClickRatio(pageViews: number, linkClicks: number): MetricResult {
  return safeDivide(pageViews, linkClicks);
}

/** Conversão de página em lead = leads / visualizações de página × 100 */
export function leadConversionRate(leads: number, pageViews: number): MetricResult {
  return scale(safeDivide(leads, pageViews), 100);
}

/**
 * Percentage-point difference between two already-percentage values
 * (e.g. CTR 3.2% vs 2.5% -> 0.7 p.p.), distinct from a relative percent
 * change. Never conflate the two in a report.
 */
export function percentagePointDiff(currentPct: number, previousPct: number): number {
  return currentPct - previousPct;
}

/** Relative percent change between two totals (e.g. spend this week vs last week). */
export function percentChange(current: number, previous: number): MetricResult {
  return scale(safeDivide(current - previous, previous), 100);
}

/**
 * Weighted CPM/CPL/CPC across campaigns: recompute from summed totals, never
 * average the per-campaign ratios (a simple mean of CPLs is misleading when
 * spend/leads differ a lot between campaigns).
 */
export function weightedCpl(campaigns: { spend: number; leads: number }[]): MetricResult {
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
  return cpl(totalSpend, totalLeads);
}
