import { DailySnapshot, DailyStockAnalysis, Rating } from "./types";

export const tradingDates = ["2026-07-10", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20"];

const companies = [
  ["6669", "Wiwynn", "AI Server", 2815, 3370, 92],
  ["2313", "Compeq", "PCB", 238.5, 286, 89],
  ["2383", "Elite Material", "PCB", 1590, 1870, 87],
  ["5274", "Aspeed", "Semiconductor", 4510, 5200, 85],
  ["3017", "Asia Vital Components", "Thermal", 812, 930, 83],
  ["2344", "Winbond", "Memory", 31.2, 37.5, 81],
  ["3665", "BizLink", "Electronic Components", 486, 558, 79],
  ["2059", "King Slide", "AI Server", 1585, 1780, 78],
  ["3533", "Lotes", "Electronic Components", 2190, 2450, 76],
  ["2458", "Elan", "Semiconductor", 168, 192, 74],
] as const;

const ratingFor = (score: number): Rating => score >= 88 ? "Strong Buy" : score >= 82 ? "Buy" : score >= 76 ? "Watch" : "Hold";

function stockFor(company: typeof companies[number], date: string, dateIndex: number, index: number): DailyStockAnalysis {
  const [ticker, stockName, industry, basePrice, baseFair, baseScore] = company;
  const shift = dateIndex - 6;
  const garpScore = Math.max(60, Math.min(96, baseScore + Math.round(shift * .55 + ((index + dateIndex) % 3 - 1))));
  const currentPrice = Math.round(basePrice * (1 + shift * .004 + ((index % 3) - 1) * .003) * 10) / 10;
  const fairValueBase = Math.round(baseFair * (1 + shift * .002) * 10) / 10;
  const upsidePercent = Math.round((fairValueBase / currentPrice - 1) * 1000) / 10;
  const rank = index + 1;
  const previousRank = dateIndex === 0 ? null : Math.max(1, Math.min(10, rank + ((index + dateIndex) % 4 === 0 ? 2 : (index + dateIndex) % 3 === 0 ? -1 : 0)));
  const growth = Math.round((18 + (9 - index) * 1.9 + dateIndex * .5) * 10) / 10;
  const roe = Math.round((13 + (10 - index) * 1.35) * 10) / 10;
  const peg = Math.round((.58 + index * .065) * 100) / 100;
  return {
    analysisDate: date, ticker, stockName, industry, rank, previousRank,
    rating: ratingFor(garpScore), currentPrice,
    fairValueLow: Math.round(fairValueBase * .9 * 10) / 10,
    fairValueBase,
    fairValueHigh: Math.round(fairValueBase * 1.12 * 10) / 10,
    upsidePercent,
    ttmEps: Math.round((currentPrice / (15 + index * .8)) * 100) / 100,
    forecastEpsGrowth: growth, pe: Math.round((15 + index * .8) * 10) / 10, peg, roe,
    revenueGrowth: Math.round((12 + (9 - index) * 1.4) * 10) / 10,
    operatingMargin: Math.round((11 + (9 - index) * 1.1) * 10) / 10,
    marketCap: 95 + (10 - index) * 63,
    garpScore,
    valuationScore: Math.max(60, 94 - index * 3),
    growthScore: Math.max(62, 93 - index * 2),
    qualityScore: Math.max(64, 91 - index * 2),
    cashFlowScore: Math.max(58, 88 - index * 2),
    expectationScore: Math.max(60, 90 - index * 3 + dateIndex),
    riskScore: Math.min(55, 24 + index * 2),
    reasons: [
      `Forecast EPS growth remains positive at ${growth}%`,
      `PEG of ${peg.toFixed(2)} is below the peer median`,
      `ROE of ${roe}% indicates solid capital efficiency`,
      `Base fair value implies ${upsidePercent}% potential upside`,
    ],
    risks: ["End-market demand may be cyclical", "Consensus estimates may diverge", "Margin pressure from product-mix changes"],
    latestEvents: [
      { date, type: "Estimate revision", summary: "Consensus EPS estimate revised upward", direction: "positive", source: "Demo research feed", url: "#methodology" },
      { date: "2026-07-15", type: "Revenue", summary: "Monthly revenue maintained positive momentum", direction: "positive", source: "Demo company filing", url: "#methodology" },
      { date: "2026-07-10", type: "Risk monitor", summary: "Sector valuation dispersion increased", direction: "neutral", source: "Demo market monitor", url: "#methodology" },
    ],
    epsHistory: Array.from({ length: 10 }, (_, q) => Math.round((currentPrice / 100 * (.48 + q * .055 + index * .008)) * 100) / 100),
    updatedAt: `${date}T08:30:00+08:00`,
  };
}

export const snapshots: Record<string, DailySnapshot> = Object.fromEntries(
  tradingDates.map((date, dateIndex) => [date, {
    analysisDate: date,
    stocks: companies.map((company, index) => stockFor(company, date, dateIndex, index)),
    isDemo: true,
    updatedAt: `${date}T08:30:00+08:00`,
  }])
);

export function getSnapshot(date: string): DailySnapshot | null {
  return snapshots[date] ?? null;
}
