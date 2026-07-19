"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { dataSources, getSnapshot, snapshots, tradingDates } from "@/lib/real-data";
import { DailyStockAnalysis, Rating } from "@/lib/types";

const money = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
const scoreColor = (score: number) => score >= 85 ? "var(--positive)" : score >= 75 ? "var(--accent)" : "var(--warning)";
const ratingLabel: Record<Rating,string> = { "Strong Buy":"強力買進", Buy:"買進", Watch:"觀察", Hold:"持有", Avoid:"避開" };

function RankMove({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="move new">新進</span>;
  const delta = previous - current;
  if (!delta) return <span className="move">—</span>;
  return <span className={`move ${delta > 0 ? "up" : "down"}`}>{delta > 0 ? "↑" : "↓"} {Math.abs(delta)}</span>;
}

function KpiCard({ label, value, delta, hint }: { label: string; value: string | number; delta: number; hint: string }) {
  return <article className="kpi" title={hint}><div><span>{label}</span><b>ⓘ</b></div><strong>{value}</strong><p className={delta >= 0 ? "positive" : "negative"}>{delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% <small>較前一交易日</small></p></article>;
}

function RankingBars({ stocks, selected, onSelect }: { stocks: DailyStockAnalysis[]; selected: string; onSelect: (ticker: string) => void }) {
  return <div className="ranking-bars">{stocks.map(stock => <button key={stock.ticker} className={selected === stock.ticker ? "active" : ""} onClick={() => onSelect(stock.ticker)}><span>{stock.stockName}<small>{stock.ticker}</small></span><i><em style={{ width: `${stock.garpScore}%`, background: scoreColor(stock.garpScore) }} /></i><b>{stock.garpScore}</b></button>)}</div>;
}

function Scatter({ stocks, selected, onSelect }: { stocks: DailyStockAnalysis[]; selected: string; onSelect: (ticker: string) => void }) {
  return <div className="scatter-wrap"><div className="ideal-zone">高成長合理估值區</div><svg viewBox="0 0 620 290" role="img" aria-label="PEG 與 EPS 成長散佈圖"><line x1="48" y1="250" x2="600" y2="250"/><line x1="48" y1="20" x2="48" y2="250"/>{stocks.map(stock => { const x = Math.max(55,Math.min(590,55 + ((stock.peg - .2) / 3) * 520)); const y = Math.max(25,Math.min(245,245 - ((stock.forecastEpsGrowth - 0) / 60) * 210)); return <g key={stock.ticker} onClick={() => onSelect(stock.ticker)} className={selected === stock.ticker ? "selected" : ""}><circle cx={x} cy={y} r="12"><title>{stock.stockName}：PEG {stock.peg}、EPS 成長代理 {stock.forecastEpsGrowth}%</title></circle><text x={x} y={y - 16}>{stock.ticker}</text></g>; })}<text x="300" y="282" className="axis">PEG → 越低越佳</text><text x="-168" y="14" transform="rotate(-90)" className="axis">EPS 成長代理（%）</text></svg></div>;
}

function FairValueChart({ stocks }: { stocks: DailyStockAnalysis[] }) {
  const max = Math.max(...stocks.map(s => s.fairValueHigh));
  return <div className="fair-chart">{stocks.slice(0, 6).map(stock => <div key={stock.ticker}><span>{stock.ticker}</span><i><em className="range" style={{ left: `${stock.fairValueLow / max * 100}%`, width: `${(stock.fairValueHigh - stock.fairValueLow) / max * 100}%` }} /><b style={{ left: `${stock.currentPrice / max * 100}%` }} title={`Current NT$${money(stock.currentPrice)}`} /></i><small>NT${money(stock.fairValueBase)}</small></div>)}</div>;
}

function ScoreComposition({ stock }: { stock: DailyStockAnalysis }) {
  const values = [["估值", stock.valuationScore], ["成長", stock.growthScore], ["企業品質", stock.qualityScore], ["現金流", stock.cashFlowScore], ["市場預期", stock.expectationScore], ["風險控制", 100 - stock.riskScore]] as const;
  return <div className="score-list">{values.map(([label, value]) => <div key={label}><span>{label}</span><i><em style={{ width: `${value}%` }} /></i><b>{value}</b></div>)}</div>;
}

function EpsChart({ stock }: { stock: DailyStockAnalysis }) {
  const max = Math.max(...stock.epsHistory); const points = stock.epsHistory.map((v, i) => `${35 + i * 110},${210 - v / max * 170}`).join(" ");
  return <svg className="line-chart" viewBox="0 0 570 240" role="img" aria-label="季度 EPS 趨勢"><line x1="30" y1="210" x2="550" y2="210"/><polyline points={points}/>{stock.epsHistory.map((v, i) => <g key={i}><circle cx={35 + i * 110} cy={210 - v / max * 170} r="4"><title>單季 EPS {v}</title></circle><text x={35 + i * 110} y="230">{["25Q1","25Q2","25Q3","25Q4","26Q1"][i]}</text></g>)}</svg>;
}

function SectorChart({ stocks }: { stocks: DailyStockAnalysis[] }) {
  const sectors = Object.entries(stocks.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.industry]: (acc[s.industry] ?? 0) + 1 }), {}));
  return <div className="sector-list">{sectors.map(([sector, count]) => <div key={sector}><span>{sector}</span><i><em style={{ width: `${count / stocks.length * 100}%` }} /></i><b>{count}</b></div>)}</div>;
}

function StockTable({ stocks, onSelect }: { stocks: DailyStockAnalysis[]; onSelect: (ticker: string) => void }) {
  const [query, setQuery] = useState(""); const [industry, setIndustry] = useState("All"); const [rating, setRating] = useState("All"); const [sort, setSort] = useState<"rank" | "garpScore" | "upsidePercent">("rank");
  const industries = [...new Set(stocks.map(s => s.industry))];
  const filtered = stocks.filter(s => `${s.stockName}${s.ticker}`.toLowerCase().includes(query.toLowerCase()) && (industry === "All" || s.industry === industry) && (rating === "All" || s.rating === rating)).sort((a, b) => sort === "rank" ? a.rank - b.rank : b[sort] - a[sort]);
  return <><div className="table-tools"><input aria-label="搜尋股票" placeholder="搜尋股票名稱或代號…" value={query} onChange={e => setQuery(e.target.value)}/><select value={industry} onChange={e => setIndustry(e.target.value)}><option value="All">全部產業</option>{industries.map(v => <option key={v}>{v}</option>)}</select><select value={rating} onChange={e => setRating(e.target.value)}><option value="All">全部評級</option>{(["Strong Buy", "Buy", "Watch", "Hold"] as Rating[]).map(v => <option key={v} value={v}>{ratingLabel[v]}</option>)}</select></div><div className="stock-table-wrap"><table className="stock-table"><thead><tr><th onClick={() => setSort("rank")}>排名 ↕</th><th>股票</th><th>產業</th><th>現價</th><th>基準合理價</th><th onClick={() => setSort("upsidePercent")}>潛在空間 ↕</th><th>TTM EPS</th><th>EPS 成長代理</th><th>P/E</th><th>PEG</th><th>ROE</th><th onClick={() => setSort("garpScore")}>GARP ↕</th><th>品質</th><th>評級</th><th>名次變化</th></tr></thead><tbody>{filtered.map(s => <tr key={s.ticker} onClick={() => onSelect(s.ticker)}><td><b>#{s.rank}</b></td><td><strong>{s.stockName}</strong><small>{s.ticker}</small></td><td>{s.industry}</td><td className="numeric">{money(s.currentPrice)}</td><td className="numeric">{money(s.fairValueBase)}</td><td className={`numeric ${s.upsidePercent >= 0 ? "positive":"negative"}`}>{s.upsidePercent >= 0 ? "+":""}{s.upsidePercent}%</td><td className="numeric">{s.ttmEps}</td><td className="numeric">{s.forecastEpsGrowth}%</td><td className="numeric">{s.pe}×</td><td className="numeric">{s.peg}</td><td className="numeric">{s.roe}%</td><td><span className="score-chip">{s.garpScore}</span></td><td>{s.qualityScore}</td><td><span className={`rating ${s.rating.toLowerCase().replace(" ", "-")}`}>{ratingLabel[s.rating]}</span></td><td><RankMove current={s.rank} previous={s.previousRank}/></td></tr>)}</tbody></table></div><p className="table-footer">顯示 {filtered.length}／{stocks.length} 檔追蹤股票 · 點擊任一列查看完整分析</p></>;
}

function Detail({ stock }: { stock: DailyStockAnalysis }) {
  return <section className="detail-grid"><article className="panel investment-card"><div className="panel-head"><div><p className="overline">個股完整分析</p><h2>{stock.stockName} <span>{stock.ticker}</span></h2><small>{stock.industry} · {stock.updatedAt.slice(0,10)} {stock.updatedAt.slice(11,16)} 更新</small></div><span className={`rating ${stock.rating.toLowerCase().replace(" ", "-")}`}>{ratingLabel[stock.rating]}</span></div><div className="investment-stats"><div><span>GARP 總分</span><strong>{stock.garpScore}</strong></div><div><span>合理價區間</span><strong>NT${money(stock.fairValueLow)}–{money(stock.fairValueHigh)}</strong></div><div><span>潛在報酬</span><strong className={stock.upsidePercent >= 0 ? "positive":"negative"}>{stock.upsidePercent >= 0 ? "+":""}{stock.upsidePercent}%</strong></div></div><p className="conclusion">依 TW-GARP 八因子模型，綜合評估成長、估值、品質、現金流與財務風險。</p><div className="reason-risk"><div><h3>入選理由</h3>{stock.reasons.map(v => <p key={v}>✓ {v}</p>)}</div><div><h3>主要風險</h3>{stock.risks.map(v => <p key={v}>△ {v}</p>)}</div></div></article><article className="panel"><div className="panel-head"><div><p className="overline">評分組成</p><h2>六大構面</h2></div></div><ScoreComposition stock={stock}/></article></section>;
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
    ["分析股票數", snapshot.stocks.length, 0, "目前真實資料追蹤池中的公司數"], ["強力買進", snapshot.stocks.filter(s => s.rating === "Strong Buy").length, 0, "GARP 總分達 85 分以上"], ["新進榜", snapshot.stocks.filter(s => s.previousRank === null).length, 0, "相較前一交易日首次出現在排名"], ["EPS 成長", snapshot.stocks.filter(s => s.forecastEpsGrowth > 0).length, 0, "最新季度 EPS/營收成長代理為正；不是法人預估上修"], ["低於合理價", snapshot.stocks.filter(s => s.upsidePercent > 0).length, 0, "現價低於模型基準合理價"], ["PEG < 1", snapshot.stocks.filter(s => s.peg < 1).length, 0, "以最新季成長代理計算 PEG 小於 1"], ["平均 GARP", Math.round(snapshot.stocks.reduce((a,s)=>a+s.garpScore,0)/snapshot.stocks.length), 0, "追蹤池平均 GARP 分數"], ["高風險", snapshot.stocks.filter(s => s.riskScore >= 60).length, 0, "Risk Score 達 60 分以上"],
  ] as const : [], [snapshot]);

  if (loading) return <div className="dashboard" data-theme={theme}><header className="topbar"><div className="logo">G</div><b>台灣 GARP 品質成長分析</b></header><div className="page-shell skeleton-grid">{Array.from({length:12},(_,i)=><div className="skeleton" key={i}/>)}</div></div>;
  if (!snapshot || !stock) return <div className="state-card"><h1>此交易日沒有分析快照</h1><p>可能原因：當日休市或資料尚未完成。請返回最近一個有效交易日。</p><button onClick={() => pickDate(latest)}>回到最新交易日</button></div>;
  const history=tradingDates.map(d=>snapshots[d].stocks.find(s=>s.ticker===stock.ticker)!).filter(Boolean);

  return <div className="dashboard" data-theme={theme}>
    <header className="topbar"><div className="brand-group"><div className="logo">G</div><div><b>台灣 GARP 分析</b><span>品質成長選股儀表板</span></div></div><nav><a href="#ranking">每日排名</a><a href="#analysis">個股分析</a><a href="#methodology">資料與方法</a><button className="theme-toggle" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="切換顯示模式">{theme === "light" ? "◐ 深色" : "☀ 淺色"}</button></nav></header>
    <main className="page-shell">
      <section className="dashboard-title"><div><p className="overline">台灣股票投資情報</p><h1>GARP 品質成長儀表板</h1><p>整合實際收盤價、財報、合理估值、獲利成長與風險的每日排名。</p></div><div className="freshness"><span>● 真實資料</span><p>資料快照</p><b>{snapshot.analysisDate} · 收盤後</b></div></section>
      <section className="date-filter"><div><b>分析日期</b><span>最近 7 個有效交易日</span></div>{tradingDates.map(d => <button className={date === d ? "active" : ""} key={d} onClick={() => pickDate(d)}><small>{new Date(`${d}T00:00:00`).toLocaleDateString("zh-TW", { weekday:"short" })}</small>{shortDate(d)}</button>)}</section>
      <section className="kpi-grid">{kpis.map(([label,value,delta,hint]) => <KpiCard key={label} label={label} value={value} delta={delta} hint={hint}/>)}</section>
      <section className="alerts"><div className="section-title"><div><p className="overline">機會與風險監控</p><h2>重要訊號提醒</h2></div><span>{snapshot.stocks.length} 檔監控中</span></div><div className="alert-grid"><article className="opportunity"><b>◆ 機會</b><h3>{snapshot.stocks.filter(s=>s.peg<1).length} 檔 PEG 小於 1</h3><p>以最新季 EPS 與營收成長代理計算，不等同法人預估。</p></article><article className="opportunity"><b>◆ 機會</b><h3>{snapshot.stocks.filter(s=>s.upsidePercent>0).length} 檔低於基準合理價</h3><p>合理價採預估 EPS × 合理 P/E 三情境模型。</p></article><article className="warning"><b>△ 警示</b><h3>{snapshot.stocks.filter(s=>s.cashFlowScore<50).length} 檔現金流品質偏弱</h3><p>最新季營業現金流扣除資本支出後為負。</p></article><article className="info"><b>● 資訊</b><h3>法人預估尚未接入</h3><p>Expectation Score 固定採 50 分中性值，避免虛構上修資料。</p></article></div></section>
      <section className="panel ranking-panel" id="ranking"><div className="panel-head"><div><p className="overline">每日選股</p><h2>真實資料追蹤池 Top 10</h2><small>依 TW-GARP 八因子模型計算；不宣稱涵蓋全部上市櫃公司</small></div><span className="demo-pill">REAL DATA</span></div><StockTable stocks={snapshot.stocks} onSelect={setSelected}/></section>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">綜合評分</p><h2>GARP 排名</h2></div><span>滿分 100</span></div><RankingBars stocks={snapshot.stocks} selected={selected} onSelect={setSelected}/></article><article className="panel"><div className="panel-head"><div><p className="overline">估值 × 成長</p><h2>投資機會分布圖</h2></div><span>點擊圓點選取股票</span></div><Scatter stocks={snapshot.stocks} selected={selected} onSelect={setSelected}/></article></section>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">價格定位</p><h2>現價與合理價區間</h2></div><span>● 現價 · ▬ 合理價</span></div><FairValueChart stocks={snapshot.stocks}/></article><article className="panel"><div className="panel-head"><div><p className="overline">分散程度</p><h2>產業分布</h2></div><span>追蹤池 Top 10</span></div><SectorChart stocks={snapshot.stocks}/></article></section>
      <div id="analysis"><Detail stock={stock}/></div>
      <section className="chart-grid"><article className="panel"><div className="panel-head"><div><p className="overline">獲利趨勢</p><h2>{stock.stockName} 單季 EPS</h2></div><span>2025 Q1–2026 Q1 實績</span></div><EpsChart stock={stock}/></article><article className="panel"><div className="panel-head"><div><p className="overline">七個交易日趨勢</p><h2>排名與分數變化</h2></div><span>{stock.ticker}</span></div><div className="trend-cards"><div><span>GARP 分數</span><strong>{stock.garpScore}</strong><small>{stock.garpScore-history[0].garpScore>=0?"↑":"↓"} {Math.abs(stock.garpScore-history[0].garpScore)} 分</small></div><div><span>目前排名</span><strong>#{stock.rank}</strong><small>{history[0].rank-stock.rank>=0?"↑":"↓"} {Math.abs(history[0].rank-stock.rank)} 名</small></div><div><span>基準合理價</span><strong>NT${money(stock.fairValueBase)}</strong><small>依財報與合理 P/E</small></div><div><span>EPS 成長代理</span><strong>{stock.forecastEpsGrowth}%</strong><small>最新季實績，非法人預估</small></div></div><div className="mini-trend">{history.map((s,i)=><div key={s.analysisDate}><i style={{height:`${Math.max(15,s.garpScore)}%`}} title={`${s.analysisDate}：${s.garpScore} 分`}/><span>{shortDate(tradingDates[i])}</span></div>)}</div></article></section>
      <section className="panel events"><div className="panel-head"><div><p className="overline">事件與風險</p><h2>最近重要資料</h2></div><span>{stock.stockName}</span></div>{stock.latestEvents.map(event => <article key={`${event.date}${event.type}`}><time>{event.date}</time><i className={event.direction}/><div><b>{event.type}</b><p>{event.summary}</p><a href={event.url} target="_blank" rel="noreferrer">{event.source} ↗</a></div><span className={event.direction}>{event.direction === "positive" ? "正向" : event.direction === "negative" ? "負向" : "中性"}</span></article>)}</section>
      <section className="methodology panel" id="methodology"><div><p className="overline">資料與方法</p><h2>透明、可追溯的計分</h2><p>依專案 Instructions 的八因子 10 分模型，整合 EPS 成長、P/E、PEG、ROE、P/B、股利、自由現金流、負債與市場預期。P/E 不會單獨決定便宜或昂貴。</p></div><div><b>資料限制</b><p>法人一致 EPS 預估尚未接入，Expectation Score 固定採 50 分中性值。畫面上的「EPS 成長代理」是最新季度實績與營收成長的組合，不是法人預測。</p></div><div><b>資料來源</b>{dataSources.map(source=><p key={source.name}><a href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong> ↗</a><br/>{source.scope}</p>)}</div></section>
    </main><footer><b>台灣 GARP 品質成長分析</b><span>真實資料追蹤池 · 非投資建議</span><span>© 2026</span></footer>
  </div>;
}
