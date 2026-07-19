import { DailySnapshot, DailyStockAnalysis, Rating, StockEvent } from "./types";

// 真實資料快照：價格來自 TWSE；財報來自 TWSE/MOPS 的 FinMind 結構化鏡像。
// 法人一致預估尚未接入，因此 expectationScore 採中性值，EPS growth 為最新季度實績年增率。
export const tradingDates = ["2026-07-08", "2026-07-09", "2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"];

const companies = {
  "6669": { name:"緯穎", industry:"AI 伺服器", eps:[52.7,65.23,82.92,74.21,75.95], revenue25:170655284000, revenue26:276507734000, operatingIncome:17458392000, equity:140164269000, assets:432576398000, cfo:-16154195000, capex:-3871756000, pb:6.13, dividendYield:3.56 },
  "2458": { name:"義隆", industry:"半導體", eps:[1.92,1.24,2.81,2.57,2.46], revenue25:3118884000, revenue26:3224766000, operatingIncome:778771000, equity:9798057000, assets:16710597000, cfo:927887000, capex:-323346000, pb:4.87, dividendYield:4.3 },
  "3533": { name:"嘉澤", industry:"電子零組件", eps:[20.22,6.69,20.71,22.53,21.37], revenue25:7765494000, revenue26:9327579000, operatingIncome:2708466000, equity:44011578000, assets:54367736000, cfo:2125315000, capex:-1510588000, pb:4.99, dividendYield:1.87 },
  "3665": { name:"貿聯-KY", industry:"電子零組件", eps:[8.49,10.54,13.51,14.08,11.66], revenue25:16120785000, revenue26:20863649000, operatingIncome:3108361000, equity:46636528000, assets:85600663000, cfo:250919000, capex:-840105000, pb:7.38, dividendYield:.86 },
  "3017": { name:"奇鋐", industry:"散熱", eps:[8.28,10.3,13.67,16.92,20.17], revenue25:23332951000, revenue26:49037946000, operatingIncome:12019030000, equity:51314983000, assets:175993383000, cfo:13673650000, capex:-3656618000, pb:19.12, dividendYield:.95 },
  "2313": { name:"華通", industry:"PCB", eps:[1.1,.7,1.81,1.9,1.26], revenue25:16729875000, revenue26:19548062000, operatingIncome:1938218000, equity:46853886000, assets:93452900000, cfo:1586943000, capex:-1378184000, pb:5.39, dividendYield:1.32 },
  "2308": { name:"台達電", industry:"電源與能源", eps:[3.94,5.37,7.16,6.67,7.91], revenue25:118919406000, revenue26:159352652000, operatingIncome:28417303000, equity:357259207000, assets:684173975000, cfo:19931192000, capex:-11091192000, pb:15.09, dividendYield:.67 },
  "2344": { name:"華邦電", industry:"記憶體", eps:[-.24,-.29,.65,.76,2.25], revenue25:19992617000, revenue26:38253064000, operatingIncome:12550494000, equity:122893519000, assets:229813688000, cfo:12365781000, capex:-2916222000, pb:5.98, dividendYield:.32 },
  "2059": { name:"川湖", industry:"AI 伺服器", eps:[26.35,6.45,33.55,36.88,36.58], revenue25:3954199000, revenue26:5449725000, operatingIncome:3654349000, equity:31528643000, assets:39510069000, cfo:3076224000, capex:-159025000, pb:23.85, dividendYield:.65 },
  "2383": { name:"台光電", industry:"PCB", eps:[10.01,10.02,11.19,10.44,14.9], revenue25:21680064000, revenue26:33067261000, operatingIncome:7128470000, equity:47920935000, assets:130976723000, cfo:2703047000, capex:-5663623000, pb:33.59, dividendYield:.56 },
} as const;

const prices: Record<keyof typeof companies, number[]> = {
  "6669":[5050,5040,4960,4905,5095,5115,4620], "2458":[186,183.5,183,179.5,178.5,175.5,164.5],
  "3533":[1990,1955,1980,1925,2025,2020,1865], "3665":[1900,1865,1865,1775,1910,1955,1765],
  "3017":[2325,2350,2225,2120,2165,2225,2200], "2313":[224,223,235,225.5,248,235.5,212],
  "2308":[1885,1880,1890,1855,1890,1905,1740], "2344":[168.5,176.5,167,164.5,180.5,172,155],
  "2059":[8095,8250,8080,7995,8500,8655,7890], "2383":[5315,5295,5125,4970,5080,4990,4495],
};

const clamp = (min:number, max:number, value:number) => Math.max(min, Math.min(max, value));
const round = (value:number, digits=1) => Number(value.toFixed(digits));
const ratingFor = (score:number): Rating => score >= 85 ? "Strong Buy" : score >= 70 ? "Buy" : score >= 55 ? "Watch" : score >= 40 ? "Hold" : "Avoid";

function factorScores(ticker:keyof typeof companies, price:number, dateIndex:number) {
  const c=companies[ticker]; const ttmEps=c.eps.slice(1).reduce((a,b)=>a+b,0); const pe=price/ttmEps;
  const epsGrowth=c.eps[0] > 0 ? (c.eps[4]/c.eps[0]-1)*100 : (c.revenue26/c.revenue25-1)*100;
  const revenueGrowth=(c.revenue26/c.revenue25-1)*100; const growthProxy=clamp(1,60,(epsGrowth+revenueGrowth)/2);
  const peg=pe/growthProxy; const pb=c.pb*(price/prices[ticker][6]); const roe=pb/pe*100;
  const debtRatio=(c.assets-c.equity)/c.assets*100; const fcf=c.cfo+c.capex;
  const epsPts=epsGrowth>=30?2:epsGrowth>=15?1.6:epsGrowth>=5?1.2:epsGrowth>=0?.7:0;
  const pePts=pe<=15?1.5:pe<=22?1.2:pe<=30?.9:pe<=45?.5:.2;
  const pegPts=peg<.75?1.5:peg<1?1.25:peg<1.5?.9:peg<2?.5:.15;
  const roePts=roe>=20?1.5:roe>=15?1.2:roe>=10?.9:roe>=5?.5:.1;
  const pbPts=(pb<3?.75:pb<6?.55:pb<10?.35:.15)+(roe>=20?.0:0);
  const dividendPts=c.dividendYield>=4?.75:c.dividendYield>=2?.55:c.dividendYield>=1?.35:.15;
  const financePts=(fcf>0?.55:.15)+(debtRatio<40?.45:debtRatio<60?.3:.1);
  const expectationPts=.5; // 無授權法人一致預估資料，依 Instructions 採中性分，不虛構上修訊號。
  const total=epsPts+pePts+pegPts+roePts+Math.min(.75,pbPts)+dividendPts+financePts+expectationPts;
  const quality=(roePts/1.5*.45+Math.min(.75,pbPts)/.75*.2+financePts*.35)*100;
  const growth=(epsPts/2*.7+clamp(0,1,revenueGrowth/40)*.3)*100;
  const valuation=(pePts/1.5*.45+pegPts/1.5*.4+Math.min(.75,pbPts)/.75*.15)*100;
  const expectedEps=ttmEps*(1+clamp(0,30,growthProxy)/100); const basePe=clamp(12,24,12+growthProxy*.22+roe*.12);
  return { ttmEps, pe, epsGrowth, revenueGrowth, growthProxy, peg, pb, roe, debtRatio, fcf, total, quality, growth, valuation, expectedEps, basePe, dateIndex };
}

function buildSnapshots(): Record<string,DailySnapshot> {
  let priorRanks:Record<string,number>|null=null; const output:Record<string,DailySnapshot>={};
  tradingDates.forEach((date,dateIndex)=>{
    const candidates=(Object.keys(companies) as (keyof typeof companies)[]).map(ticker=>({ticker, price:prices[ticker][dateIndex], f:factorScores(ticker,prices[ticker][dateIndex],dateIndex)}));
    candidates.sort((a,b)=>b.f.total-a.f.total);
    const stocks=candidates.map(({ticker,price,f},index):DailyStockAnalysis=>{
      const c=companies[ticker]; const base=f.expectedEps*f.basePe; const low=f.expectedEps*f.basePe*.85; const high=f.expectedEps*f.basePe*1.15;
      const garpScore=round(f.total*10,0); const upside=round((base/price-1)*100); const event:StockEvent={date,type:"官方收盤價更新",summary:`TWSE 收盤價 NT$${price.toLocaleString("en-US")}`,direction:dateIndex&&price<prices[ticker][dateIndex-1]?"negative":"neutral",source:"臺灣證券交易所",url:"https://www.twse.com.tw/"};
      return {analysisDate:date,ticker,stockName:c.name,industry:c.industry,rank:index+1,previousRank:priorRanks?.[ticker]??null,rating:ratingFor(garpScore),currentPrice:price,fairValueLow:round(low),fairValueBase:round(base),fairValueHigh:round(high),upsidePercent:upside,ttmEps:round(f.ttmEps,2),forecastEpsGrowth:round(f.growthProxy),pe:round(f.pe,2),peg:round(f.peg,2),roe:round(f.roe),revenueGrowth:round(f.revenueGrowth),operatingMargin:round(c.operatingIncome/c.revenue26*100),marketCap:round(price*c.equity/(c.pb*(prices[ticker][6]/price))/c.equity*100),garpScore,valuationScore:round(f.valuation,0),growthScore:round(f.growth,0),qualityScore:round(f.quality,0),cashFlowScore:f.fcf>0?85:25,expectationScore:50,riskScore:round(clamp(10,90,f.debtRatio+(f.fcf<0?20:0)),0),reasons:[`最新季 EPS 實績年增 ${round(f.epsGrowth)}%`,`最新季營收年增 ${round(f.revenueGrowth)}%`,`ROE 推算值 ${round(f.roe)}%`,`現價相對基準合理價空間 ${upside}%`],risks:[f.fcf<0?"最新季自由現金流為負":"產業需求可能出現循環波動",f.debtRatio>60?`負債比 ${round(f.debtRatio)}% 偏高`:"估值可能隨市場風險偏好修正","尚未接入法人一致 EPS 預估，Expectation 採中性分"],latestEvents:[event,{date:"2026-03-31",type:"第一季財報",summary:`EPS ${c.eps[4]} 元，營業利益率 ${round(c.operatingIncome/c.revenue26*100)}%`,direction:c.eps[4]>=c.eps[0]?"positive":"negative",source:"公開資訊觀測站／FinMind 結構化資料",url:"https://mops.twse.com.tw/"}],epsHistory:[...c.eps],updatedAt:`${date}T13:30:00+08:00`};
    });
    priorRanks=Object.fromEntries(stocks.map(s=>[s.ticker,s.rank])); output[date]={analysisDate:date,stocks,isDemo:false,updatedAt:`${date}T13:30:00+08:00`};
  }); return output;
}

export const snapshots=buildSnapshots();
export function getSnapshot(date:string):DailySnapshot|null{return snapshots[date]??null;}

export const dataSources=[
  {name:"臺灣證券交易所",scope:"2026/7/8–7/17 每日收盤價、7/17 P/E、P/B、殖利率",url:"https://www.twse.com.tw/"},
  {name:"公開資訊觀測站",scope:"2025 Q1–2026 Q1 合併財務報表",url:"https://mops.twse.com.tw/"},
  {name:"FinMind",scope:"TWSE/MOPS 財報結構化鏡像；用於計算 EPS、營收、ROE、現金流",url:"https://finmind.github.io/"},
];
