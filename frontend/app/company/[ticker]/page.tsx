import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { calculateOverviewMetrics, formatCompact, formatCurrency, formatDate, formatMetric, getCompanyOverview, getPricePoints } from "@/lib/company";

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return <section className="overview-section"><div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div></div>{children}</section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="overview-metric"><span>{label}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div>;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return <div className="data-row"><span>{label}</span><strong>{value}</strong></div>;
}

export default async function CompanyOverviewPage({ params }: { params: Promise<{ ticker: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const { ticker } = await params;
  const data = await getCompanyOverview(decodeURIComponent(ticker));
  if (!data) notFound();
  const metrics = calculateOverviewMetrics(data);
  const points = getPricePoints(data);
  const company = data.company;
  const latest = data.latestPeriod;
  const latestIncome = latest?.income;
  const latestBalance = latest?.balance;
  const latestCash = latest?.cashFlow;
  const priceChangeClass = metrics.dailyChange !== null && metrics.dailyChange >= 0 ? "positive" : "negative";

  return <main className="company-shell">
    <header className="company-topbar"><Link className="brand-mark" href="/">Stock Intelligence</Link><nav><Link href="/">Dashboard</Link><span className="nav-current">Company overview</span></nav><span className="user-chip">{session.user.name}</span></header>
    <div className="company-breadcrumb"><Link href="/">Dashboard</Link><span>/</span><span>{company.ticker}</span></div>

    <section className="company-hero">
      <div><p className="eyebrow">{company.exchange || "Exchange unavailable"} · {company.sector || "Sector unavailable"}</p><h1>{company.name}</h1><div className="company-meta"><span className="ticker-badge">{company.ticker}</span><span>{company.industry || "Industry unavailable"}</span><span>{company.currency}</span></div></div>
      <div className="price-block"><span>Latest close</span><strong>{formatCurrency(metrics.currentPrice, company.currency)}</strong><b className={priceChangeClass}>{formatMetric(metrics.dailyChange, " ")} ({formatMetric(metrics.dailyChangePercent, "%")})</b></div>
    </section>

    <div className="overview-grid metrics-grid"><Metric label="Market cap" value={formatCompact(metrics.marketCap, company.currency)} detail="Not available in source data" /><Metric label="P / E" value={formatMetric(metrics.pe, "x")} detail="Not available in source data" /><Metric label="ROE" value={formatMetric(metrics.roe, "%")} /><Metric label="ROCE" value={formatMetric(metrics.roce, "%")} /><Metric label="Debt / equity" value={formatMetric(metrics.debtEquity, "x")} /><Metric label="Revenue growth" value={formatMetric(metrics.revenueGrowth, "%")} /></div>

    <Section eyebrow="Market data" title="Price history"><div className="chart-card"><div className="chart-meta"><div><span>Close price</span><strong>{formatCurrency(metrics.currentPrice, company.currency)}</strong></div><span>{data.prices.length ? `${data.prices.length} observations` : "No observations"}</span></div>{points.length > 1 ? <svg className="price-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${company.ticker} close price history`}><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".22" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${points.map((point) => `${point.x},${point.y}`).join(" ")} 100,100`} fill="url(#chart-fill)" /><polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg> : <div className="empty-state">No market price history is available for this company.</div>}<div className="chart-axis"><span>{data.prices[0] ? formatDate(data.prices[0].date) : "—"}</span><span>{data.prices.at(-1) ? formatDate(data.prices.at(-1)!.date) : "—"}</span></div></div></Section>

    <div className="overview-columns"><Section eyebrow="Reported data" title="Financial snapshot"><div className="data-card"><DataRow label="Reporting period" value={latest ? `${latest.periodEnd} · ${latest.periodType}` : "—"} /><DataRow label="Revenue" value={formatCompact(latestIncome ? Number(latestIncome.revenue) : null, company.currency)} /><DataRow label="Gross profit" value={formatCompact(latestIncome ? Number(latestIncome.grossProfit) : null, company.currency)} /><DataRow label="Operating income" value={formatCompact(latestIncome ? Number(latestIncome.operatingIncome) : null, company.currency)} /><DataRow label="Net income" value={formatCompact(latestIncome ? Number(latestIncome.netIncome) : null, company.currency)} /><DataRow label="Free cash flow" value={formatCompact(latestCash ? Number(latestCash.freeCashFlow) : null, company.currency)} /></div></Section><Section eyebrow="Balance sheet" title="Financial health"><div className="data-card"><DataRow label="Cash & equivalents" value={formatCompact(latestBalance ? Number(latestBalance.cashAndEquivalents) : null, company.currency)} /><DataRow label="Total assets" value={formatCompact(latestBalance ? Number(latestBalance.totalAssets) : null, company.currency)} /><DataRow label="Total liabilities" value={formatCompact(latestBalance ? Number(latestBalance.totalLiabilities) : null, company.currency)} /><DataRow label="Total debt" value={formatCompact(latestBalance ? Number(latestBalance.totalDebt) : null, company.currency)} /><DataRow label="Total equity" value={formatCompact(latestBalance ? Number(latestBalance.totalEquity) : null, company.currency)} /></div></Section></div>

    <div className="overview-columns"><Section eyebrow="Cash conversion" title="Earnings quality"><div className="quality-card"><div className="quality-score"><strong>{formatMetric(metrics.fcf !== null && latestIncome?.netIncome ? (metrics.fcf / Number(latestIncome.netIncome)) * 100 : null, "%")}</strong><span>FCF / net income</span></div><p>Derived only when reported free cash flow and net income are available for the latest period.</p><DataRow label="Operating cash flow" value={formatCompact(latestCash ? Number(latestCash.operatingCashFlow) : null, company.currency)} /><DataRow label="Capital expenditures" value={formatCompact(latestCash ? Number(latestCash.capitalExpenditures) : null, company.currency)} /></div></Section><Section eyebrow="Reference data" title="Valuation summary"><div className="data-card">{data.valuation ? <><DataRow label="Model" value={data.valuation.modelName} /><DataRow label="As of" value={formatDate(data.valuation.result?.asOfDate ?? null)} /><DataRow label="Enterprise value" value={formatCompact(data.valuation.result ? Number(data.valuation.result.enterpriseValue) : null, company.currency)} /><DataRow label="Implied share price" value={formatCurrency(data.valuation.result ? Number(data.valuation.result.impliedSharePrice) : null, company.currency)} /><DataRow label="Upside" value={formatMetric(data.valuation.result ? Number(data.valuation.result.upsidePercent) : null, "%")} /></> : <div className="empty-state">No valuation model has been recorded for this company.</div>}</div></Section></div>

    <section className="assumption-panel"><div><p className="eyebrow">Data discipline</p><h2>Risk & assumptions</h2><p>This overview presents reported values and transparent ratios from the connected database. Missing values are shown as unavailable rather than estimated. DCF assumptions and forward-looking scenarios are intentionally not included.</p></div><div className="assumption-list"><span>Source period: {latest?.periodEnd || "Unavailable"}</span><span>Price observations: {data.prices.length}</span><span>Forward estimates: Not included</span></div></section>
  </main>;
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) { return { title: `${(await params).ticker.toUpperCase()} Company Overview | Stock Intelligence`, description: "Institutional company overview with reported financial and market data." }; }
