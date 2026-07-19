const stocks = [
  { ticker: "2313", name: "Compeq", score: "84", signal: "Watch", price: "NT$238.5", change: "+2.4%" },
  { ticker: "6669", name: "Wiwynn", score: "81", signal: "Attractive", price: "NT$2,815", change: "+1.8%" },
  { ticker: "2344", name: "Winbond", score: "76", signal: "Watch", price: "NT$31.2", change: "−0.6%" },
];

const metrics = [
  ["Quality universe", "128", "Screened companies"],
  ["GARP candidates", "18", "Passing all criteria"],
  ["New signals", "3", "Since last update"],
];

export default function Home() {
  return (
    <main>
      <nav>
        <a className="brand" href="#"><span>G</span> GARP Analytics Taiwan</a>
        <div className="navlinks"><a href="#methodology">Methodology</a><a href="#watchlist">Watchlist</a><button>Request access</button></div>
      </nav>

      <section className="hero">
        <div>
          <p className="eyebrow">TAIWAN EQUITY INTELLIGENCE</p>
          <h1>Growth insights.<br/><em>Reasonable valuations.</em></h1>
          <p className="intro">A disciplined research platform that surfaces quality Taiwan companies where sustainable growth meets sensible pricing.</p>
          <div className="actions"><a className="primary" href="#watchlist">Explore the watchlist</a><a className="secondary" href="#methodology">View methodology →</a></div>
        </div>
        <div className="signal-card">
          <div className="card-head"><div><small>LATEST SIGNAL</small><h2>Compeq Manufacturing</h2><p>TWSE · 2313</p></div><span className="badge">WATCH</span></div>
          <div className="score"><div><strong>84</strong><span>/100</span></div><p>Composite GARP score</p></div>
          <div className="bars"><i style={{width:"84%"}}/><i style={{width:"78%"}}/><i style={{width:"72%"}}/></div>
          <div className="signal-grid"><p><span>EPS revision</span><b>+12.4%</b></p><p><span>Forward PEG</span><b>0.86×</b></p><p><span>ROE</span><b>18.2%</b></p></div>
          <small>Illustrative data · Last updated 08:30 TST</small>
        </div>
      </section>

      <section className="metrics" aria-label="Platform metrics">
        {metrics.map(([label, value, note]) => <article key={label}><p>{label}</p><strong>{value}</strong><span>{note}</span></article>)}
      </section>

      <section className="method" id="methodology">
        <div><p className="eyebrow">OUR APPROACH</p><h2>Signal, not noise.</h2><p>We combine earnings momentum, durable business quality, and valuation discipline into one transparent framework.</p></div>
        <ol><li><b>01</b><span><strong>Growth</strong>EPS revisions and structural revenue momentum.</span></li><li><b>02</b><span><strong>Quality</strong>Returns, cash conversion, and balance-sheet resilience.</span></li><li><b>03</b><span><strong>Value</strong>Growth-adjusted multiples and margin of safety.</span></li></ol>
      </section>

      <section className="watchlist" id="watchlist">
        <div className="section-head"><div><p className="eyebrow">MARKET MONITOR</p><h2>Featured watchlist</h2></div><p>Illustrative data for the initial website preview</p></div>
        <div className="table">
          <div className="row headings"><span>Company</span><span>GARP score</span><span>Signal</span><span>Price</span><span>Daily move</span></div>
          {stocks.map((stock) => <div className="row" key={stock.ticker}><span><b>{stock.name}</b><small>TWSE · {stock.ticker}</small></span><span className="score-pill">{stock.score}</span><span>{stock.signal}</span><span>{stock.price}</span><span className={stock.change.startsWith("+") ? "up" : "down"}>{stock.change}</span></div>)}
        </div>
      </section>

      <footer><span>GARP Analytics Taiwan</span><p>Research intelligence for informed decisions. Not investment advice.</p><small>© 2026</small></footer>
    </main>
  );
}
