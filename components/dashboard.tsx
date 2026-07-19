"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSnapshot, tradingDates } from "@/lib/demo-data";
import { DailyStockAnalysis, Rating } from "@/lib/types";

const money = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const scoreColor = (score: number) => score >= 85 ? "var(--positive)" : score >= 75 ? "var(--accent)" : "var(--warning)";

function RankMove({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="move new">NEW</span>;
  const delta = previous - current;
  if (!delta) return <span className="move">—</span>;
  return <span className={`move ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}</span>;
}

function KpiCard({ label, value, delta, hint }: { label: string; value: string | number; delta: number; hint: string }) {
  return <article className="kpi" title={hint}><div><span>{label}</span><b>ⓘ</b></div><strong>{value}</strong><p className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% <small>vs previous session</small></p></article>;
}

function RankingBars({ stocks, selected, onSelect }: { stocks: DailyStockAnalysis[]; selected: string; onSelect: (ticker: string) => void }) {
  return <div className="ranking-bars">{stocks.map(stock => <button key={stock.ticker} className={selected === stock.ticker ? "active" : ""} onClick={() => onSelect(stock.ticker)}><span>{stock.stockName}<small>{stock.ticker}</small></span><i><em style={{ width: `${stock.garpScore}%`, background: scoreColor(stock.garpScore) }} /></i><b>{stock.garpScore}</b></button>)}</div>;
}

function Scatter({ stocks, selected, onSelect }: { stocks: DailyStockAnalysis[]; selected: string; onSelect: (ticker: string) => void }) {
  return <div className="scatter-wrap"><div className="ideal-zone">IDEAL ZONE</div><svg viewBox="0 0 620 290" role="img" aria-label="PEG versus forecast EPS growth scatter plot"><line x1="48" y1="250" x2="600" y2="250"/><line x1="48" y1="20" x2="48" y2="250"/>{stocks.map(stock => { const x = 55 + ((stock.peg - .5) / .8) * 520; const y = 245 - ((stock.forecastEpsGrowth - 15) / 25) * 210; return <g key={stock.ticker} onClick={() => onSelect(stock.ticker)} className={selected === stock.ticker ? "selected" : ""}><circle cx={x} cy={y} r={8 + stock.marketCap / 90}><title>{stock.stockName}: PEG {stock.peg}, EPS growth {stock.forecastEpsGrowth}%</title></circle><text x={x} y={y - 16}>{stock.ticker}</text></g>; })}<text x="300" y="282" className="axis">PEG → lower is better</text><text x="-168" y="14" transform="rotate(-90)" className="axis">Forecast EPS growth (%)</text></svg></div>;
}

function FairValueChart({ stocks }: { stocks: DailyStockAnalysis[] }) {
  const max = Math.max(...stocks.map(s => s.fairValueHigh));
  return <div className="fair-chart">{stocks.slice(0, 6).map(stock => <div key={stock.ticker}><span>{stock.ticker}</span><i><em className="range" style={{ left: `${stock.fairValueLow / max * 100}%`, width: `${(stock.fairValueHigh - stock.fairValueLow) / max * 100}%` }} /><b style={{ left: `${stock.currentPrice / max * 100}%` }} title={`Current NT$${money(stock.currentPrice)}`} /></i><small>NT${money(stock.fairValueBase)}</small></div>)}</div>;
}

function ScoreComposition({ stock }: { stock: DailyStockAnalysis }) {
  const values = [["Valuation", stock.valuationScore], ["Growth", stock.growthScore], ["Quality", stock.qualityScore], ["Cash flow", stock.cashFlowScore], ["Expectations", stock.expectationScore], ["Risk control", 100 - stock.riskScore]] as const;
  return <div className="score-list">{values.map(([label, value]) => <div key={label}><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value}</b></div>)}</div>;
}

function EpsChart({ stock }: { stock: DailyStockAnalysis }) {
  const max = Math.max(...stock.epsHistory); const points = stock.epsHistory.map((v, i) => `${35 + i * 55},${210 - v / max * 170}`).join(" ");
  return <svg className="line-chart" viewBox="0 0 570 240" role="img" aria-label="Quarterly EPS trend"><line x1="30" y1="210" x2="550" y2="210"/><polyline points={points}/>{stock.epsHistory.map((v, i) => <g key={i}><circle cx={35 + i * 55} cy={210 - v / max * 170} r="4"><title>{i < 8 ? `Actual EPS ${v}` : `Forecast EPS ${v}`}</title></circle><text x={35 + i * 55} y="230">{i < 8 ? `Q${i + 1}` : `FY${i - 7}`}</text></g>)}<line className="forecast-cut" x1="445" y1="25" x2="445" y2="210"/><text x="455" y="35" className="axis">FORECAST</text></svg>;
}

function SectorChart({ stocks }: { stocks: DailyStockAnalysis[] }) {
  const sectors = Object.entries(stocks.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.industry]: (acc[s.industry] ?? 0) + 1 }), {}));
  return <div className="sector-list">{sectors.map(([sector, count]) => <div key={sector}><span>{sector}</span><i><em style={{ width: `${count / stocks.length * 100}%` }} /></i><b>{count}</b></div>)}</div>;
}

function StockTable({ stocks, onSelect }: { stocks: DailyStockAnalysis[]; onSelect: (ticker: string) => void }) {
  const [query, setQuery] = useState(""); const [industry, setIndustry] = useState("All"); const [rating, setRating] = useState("All"); const [sort, setSort] = useState<"rank" | "garpScore" | "upsidePercent">("rank");
  const industries = [...new Set(stocks.map(s => s.industry))];
  const filtered = stocks.filter(s => `${s.stockName}${s.ticker}`.toLowerCase().includes(query.toLowerCase()) && (industry === "All" || s.industry === industry) && (rating === "All" || s.rating === rating)).sort((a, b) => sort === "rank" ? a.rank - b.rank : b[sort] - a[sort]);
  return <><div className="table-tools"><input aria-label="Search stocks" placeholder="Search name or ticker…" value={query} onChange={e => setQuery(e.target.value)}/><select value={industry} onChange={e => setIndustry(e.target.value)}><option>All</option>{industries.map(v => <option key={v}>{v}</option>)}</select><select value={rating} onChange={e => setRating(e.target.value)}><option>All</option>{(["Strong Buy", "Buy", "Watch", "Hold"] as Rating[]).map(v => <option key={v}>{v}</option>)}</select></div><div className="stock-table-wrap"><table className="stock-table"><thead><tr><th onClick={() => setSort("rank")}>Rank ↕</th><th>Company</th><th>Industry</th><th>Price</th><th>Fair value</th><th onClick={() => setSort("upsidePercent")}>Upside ↕</th><th>TTM EPS</th><th>EPS growth</th><th>P/E</th><th>PEG</th><th>ROE</th><th onClick={() => setSort("garpScore")}>GARP ↕</th><th>Quality</th><th>Rating</th><th>Move</th></tr></thead><tbody>{filtered.map(s => <tr key={s.ticker} onClick={() => onSelect(s.ticker)}><td><b>#{s.rank}</b></td><td><strong>{s.stockName}</strong><small>{s.ticker}</small></td><td>{s.industry}</td><td className="numeric">{money(s.currentPrice)}</td><td className="numeric">{money(s.fairValueBase)}</td><td className="numeric positive">+{s.upsidePercent}%</td><td className="numeric">{s.ttmEps}</td><td className="numeric positive">{s.forecastEpsGrowth}%</td><td className="numeric">{s.pe}×</td><td className="numeric">{s.peg}</td><td className="numeric">{s.roe}%</td><td><span className="score-chip">{s.garpScore}</span></td><td>{s.qualityScore}</td><td><span className={`rating ${s.rating.toLowerCase().replace(" ", "-")}`}>{s.rating}</span></td><td><RankMove current={s.rank} previous={s.previousRank}/></td></tr>)}</tbody></table></div><p className="table-footer">Showing {filtered.length} of {stocks.length} candidates · Click any row for full analysis</p></>;
}

function Detail({ stock }: { stock: DailyStockAnalysis }) {
  return <section className="detail-grid"><article className="panel investment-card"><div className="panel-head"><div><p className="overline">SELECTED STOCK</p><h2>{stock.stockName} <span>{stock.ticker}</span></h2><small>{stock.industry} · Updated {stock.updatedAt.slice(11,16)} TST</small></div><span className={`rating ${stock.rating.toLowerCase().replace(" ", "-")}`}>{stock.rating}</span></div><div className="investment-stats"><div><span>GARP score</span><strong>{stock.garpScore}</strong></div><div><span>Fair value range</span><strong>NT${money(stock.fairValueLow)}–{money(stock.fairValueHigh)}</strong></div><div><span>Potential return</span><strong className="positive">+{stock.upsidePercent}%</strong></div></div><p className="conclusion">Quality growth with improving expectations at a valuation below the modelled base fair value.</p><div className="reason-risk"><div><h3>Why it ranks</h3>{stock.reasons.map(v => <p key={v}>✓ {v}</p>)}</div><div><h3>Key risks</h3>{stock.risks.map(v => <p key={v}>△ {v}</p>)}</div></div></article><article className="panel"><div className="panel-head"><div><p className="overline">SCORE COMPOSITION</p><h2>Factor profile</h2></div></div><ScoreComposition stock={stock}/></article></section>;
}

export default function Dashboard() {
  const router = useRouter(); const pathname = usePathname(); const params = useSearchParams(); const latest = tradingDates.at(-1)!;
  const initialDate = tradingDates.includes(params.get("date") ?? "") ? params.get("date")! : latest;
  const [date, setDate] = useState(initialDate); const [selected, setSelected] = useState("6669"); const [theme, setTheme] = useState<"light" | "dark">("light"); const [loading, setLoading] = useState(true);
  const snapshot = getSnapshot(date);
  useEffect(() => { const id = window.setTimeout(() => setLoading(false), 450); return () => clearTimeout(id); }, []);
  const pickDate = (value: string) => { setDate(value); setLoading(true); const next = new URLSearchParams(params.toString()); next.set("date", value); router.replace(`${pathname}?${next}`); window.setTimeout(() => setLoading(false), 280); };
  const stock = snapshot?.stocks.find(s => s.ticker === selected) ?? snapshot?.stocks[0];
  const kpis = useMemo(() => snapshot ? [
    ["Stocks analyzed", 128, 3, "Companies passing data-quality requirements"], ["Strong Buy", snapshot.stocks.filter(s => s.rating === "Strong Buy").length, 1, "GARP score and risk thresholds passed"], ["New entrants", snapshot.stocks.filter(s => s.previousRank === null).length, 0, "New to the Top 10 versus prior session"], ["EPS upgrades", 7, 16.7, "Positive consensus EPS revisions"], ["Below fair value", snapshot.stocks.filter(s => s.upsidePercent > 0).length, 11.1, "Current price below base fair value"], ["PEG below 1", snapshot.stocks.filter(s => s.peg < 1).length, 0, "Forward PEG below 1.0"], ["Average GARP", Math.round(snapshot.stocks.reduce((a,s)=>a+s.garpScore,0)/snapshot.stocks.length), 2.4, "Mean candidate GARP score"], ["High risk", 2, -33.3, "Risk score at or above 60"],
  ] as const : [], [snapshot]);

  if (loading) return <div className="dashboard" data-theme={theme}><header className="topbar"><div className="logo">G</div><b>GARP Analytics Taiwan</b></header><div className="page-shell skeleton-grid">{Array.from({length:12},(_,i)=><div className="skeleton" key={i}/>)}</div></div>;
  if (!snapshot || !stock) return <div className="state-card"><h1>No analysis snapshot</h1><p>The selected date has no saved data. Last checked at 08:30 TST.</p><button onClick={() => pickDate(latest)}>Return to latest session</button></div>;

  return <div className="dashboard" data-theme={theme}>
    <header className="topbar"><div className="brand-group"><div className="logo">G</div><div><b>GARP Analytics</b><span>Taiwan Quality Growth</span></div></div><nav><a href="#ranking">Ranking</a><a href="#analysis">Analysis</a><a href="#methodology">Methodology</a><button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Toggle color mode">{theme === "light" ? "◐ Dark" : "☀ Light"}</button></nav></header>
    <main className="page-shell">
      <section className="dashboard-title"><div><p className="overline">TAIWAN EQUITY INTELLIGENCE</p><h1>Quality Growth Dashboard</h1><p>Daily GARP ranking, valuation, earnings expectations and risk intelligence.</p></div><div className="freshness"><span>● DEMO DATA</span><p>Snapshot updated</p><b>{snapshot.analysisDate} · 08:30 TST</b></div></section>
      <section className="date-filter"><div><b>Analysis date</b><span>Last 7 trading sessions</span></div>{tradingDates.map(d => <button className={date === d ? "active" : ""} key={d} onClick={() => pickDate(d)}><small>{new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday:"short" })}</small>{shortDate(d)}</button>)}</section>
      <section className="kpi-grid">{kpis.map(([label,value,delta,hint]) => <KpiCard key={label} label={label} value={value} delta={delta} hint={hint}/>)}</section>
      <section className="alerts"><div className="section-title"><div><p className="overline">SIGNAL MONITOR</p><h2>Opportunity & Risk Alerts</h2></div><span>8 active</span></div><div className="alert-grid"><article className="opportunity"><b>◆ OPPORTUNITY</b><h3>7 EPS upgrades detected</h3><p>Consensus expectations improved across AI server and PCB candidates.</p></article><article className="opportunity"><b>◆ OPPORTUNITY</b><h3>8 stocks trade below fair value</h3><p>Median potential upside is 17.4% based on base-case valuation.</p></article><article className="warning"><b>△ WARNING</b><h3>Sector concentration elevated</h3><p>Electronic supply-chain names represent 60% of the Top 10.</p></article><article className="info"><b>● INFORMATION</b><h3>Two ranking changes</h3><p>Estimate revisions moved candidates by more than two positions.</p></article></div></section>
      <section className="panel ranking-panel" id="ranking"><div className="panel-head"><div><p className="overline">DAILY SCREEN</p><h2>Top 10 Recommended Stocks</h2><small>TW-GARP methodology · Demo snapshots for UI validation</small></div><span className="demo-pill">DEMO DATA</span></div><StockTable stocks={snapshot.stocks} onSelect={setSelected}/></section>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">COMPOSITE SCORE</p><h2>GARP Ranking</h2></div><span>/100</span></div><RankingBars stocks={snapshot.stocks} selected={selected} onSelect={setSelected}/></article><article className="panel"><div className="panel-head"><div><p className="overline">VALUATION × GROWTH</p><h2>Opportunity Map</h2></div><span>Bubble = market cap</span></div><Scatter stocks={snapshot.stocks} selected={selected} onSelect={setSelected}/></article></section>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">PRICE POSITIONING</p><h2>Price vs Fair Value</h2></div><span>● Price · ▬ Range</span></div><FairValueChart stocks={snapshot.stocks}/></article><article className="panel"><div className="panel-head"><div><p className="overline">DIVERSIFICATION</p><h2>Sector Distribution</h2></div><span>Top 10</span></div><SectorChart stocks={snapshot.stocks}/></article></section>
      <div id="analysis"><Detail stock={stock}/></div>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">EARNINGS TREND</p><h2>{stock.stockName} EPS</h2></div><span>Actual ─ Forecast</span></div><EpsChart stock={stock}/></article><article className="panel"><div className="panel-head"><div><p className="overline">7-SESSION TREND</p><h2>Rank & Score Momentum</h2></div><span>{stock.ticker}</span></div><div className="trend-cards"><div><span>GARP Score</span><strong>{stock.garpScore}</strong><small>↑ 4 pts / 7 sessions</small></div><div><span>Current rank</span><strong>#{stock.rank}</strong><small>↑ 2 positions</small></div><div><span>Base fair value</span><strong>NT${money(stock.fairValueBase)}</strong><small>↑ 3.1%</small></div><div><span>Forecast EPS</span><strong>+{stock.forecastEpsGrowth}%</strong><small>↑ 1.8 pts</small></div></div><div className="mini-trend">{tradingDates.map((d,i)=><div key={d}><i style={{height:`${45+i*6}%`}}/><span>{shortDate(d)}</span></div>)}</div></article></section>
      <section className="panel events"><div className="panel-head"><div><p className="overline">CATALYSTS & RISKS</p><h2>Recent Events</h2></div><span>{stock.stockName}</span></div>{stock.latestEvents.map(event => <article key={`${event.date}${event.type}`}><time>{event.date}</time><i className={event.direction}/><div><b>{event.type}</b><p>{event.summary}</p><a href={event.url}>{event.source} ↗</a></div><span className={event.direction}>{event.direction === "positive" ? "Positive" : event.direction === "negative" ? "Negative" : "Neutral"}</span></article>)}</section>
      <section className="methodology panel" id="methodology"><div><p className="overline">DATA & METHODOLOGY</p><h2>Transparent by design</h2><p>Scores combine valuation, EPS growth stability, profitability, cash-flow quality, leverage, consensus revisions and price momentum. P/E is never used in isolation.</p></div><div><b>Data status</b><p>Demo snapshots isolated in <code>lib/demo-data.ts</code>. Replace with <code>/api/analysis?analysisDate=YYYY-MM-DD</code> when a production source is connected.</p></div><div><b>Freshness</b><p>Every snapshot exposes an update timestamp. Production should persist one immutable ranking snapshot per trading session.</p></div></section>
    </main><footer><b>GARP Analytics Taiwan</b><span>Demo analytics · Not investment advice</span><span>© 2026</span></footer>
  </div>;
}
