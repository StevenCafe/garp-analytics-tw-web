export type Rating = "Strong Buy" | "Buy" | "Watch" | "Hold" | "Avoid";

export type StockEvent = {
  date: string;
  type: string;
  summary: string;
  direction: "positive" | "neutral" | "negative";
  source: string;
  url: string;
};

export type DailyStockAnalysis = {
  analysisDate: string;
  ticker: string;
  stockName: string;
  industry: string;
  rank: number;
  previousRank: number | null;
  rating: Rating;
  currentPrice: number;
  fairValueLow: number;
  fairValueBase: number;
  fairValueHigh: number;
  upsidePercent: number;
  ttmEps: number;
  forecastEpsGrowth: number;
  pe: number;
  peg: number;
  roe: number;
  revenueGrowth: number;
  operatingMargin: number;
  marketCap: number;
  garpScore: number;
  valuationScore: number;
  growthScore: number;
  qualityScore: number;
  cashFlowScore: number;
  expectationScore: number;
  riskScore: number;
  reasons: string[];
  risks: string[];
  latestEvents: StockEvent[];
  epsHistory: number[];
  updatedAt: string;
};

export type DailySnapshot = {
  analysisDate: string;
  stocks: DailyStockAnalysis[];
  isDemo: boolean;
  updatedAt: string;
};
