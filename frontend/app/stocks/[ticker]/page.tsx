import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

import { fetchStock } from "@/lib/api";
import HistoryChart from "./HistoryChart";


type Props = {
  params: Promise<{
    ticker: string;
  }>;

  searchParams: Promise<{
    exchange?: string;
  }>;
};


type Stock = {
  intelligence_rank: number | null;
  ticker: string;
  company_name: string;
  exchange: string;
  latest_timestamp: string | null;
  latest_close: number | null;
  ma20: number | null;
  ma50: number | null;
  momentum_10d: number | null;
  volatility_20d: number | null;
  trend_signal: string | null;
  intelligence_score: number | null;
  intelligence_signal: string | null;
  confidence_level: string | null;
};


function formatPrice(value: number | null) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function formatNumber(value: number | null) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(2);
}


function formatLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}


function getSignalClass(signal: string | null) {
  if (signal === "BUY_CANDIDATE") {
    return "signal-buy";
  }

  if (signal === "WATCH") {
    return "signal-watch";
  }

  if (signal === "WEAK") {
    return "signal-weak";
  }

  return "signal-neutral";
}


function getTrendClass(trend: string | null) {
  if (trend === "BULLISH") {
    return "trend-bullish";
  }

  if (trend === "BEARISH") {
    return "trend-bearish";
  }

  return "trend-neutral";
}


function getScoreDescription(score: number | null) {
  if (score === null || score === undefined) {
    return "Score unavailable";
  }

  if (score >= 80) {
    return "Very strong intelligence score";
  }

  if (score >= 65) {
    return "Strong intelligence score";
  }

  if (score >= 50) {
    return "Moderate intelligence score";
  }

  if (score >= 35) {
    return "Weak intelligence score";
  }

  return "Very weak intelligence score";
}


function getScoreTone(score: number | null) {
  if (score === null || score === undefined) {
    return "score-neutral";
  }

  if (score >= 65) {
    return "score-positive";
  }

  if (score >= 50) {
    return "score-warning";
  }

  return "score-negative";
}


function getMAStatus(
  price: number | null,
  ma20: number | null,
  ma50: number | null
) {
  if (
    price === null ||
    ma20 === null ||
    ma50 === null
  ) {
    return "Insufficient data";
  }

  if (price > ma20 && ma20 > ma50) {
    return "Price above MA20 and MA50";
  }

  if (price > ma20 && price > ma50) {
    return "Price above both averages";
  }

  if (price < ma20 && price < ma50) {
    return "Price below both averages";
  }

  return "Mixed moving-average signal";
}


function getDistancePercent(
  price: number | null,
  average: number | null
) {
  if (
    price === null ||
    average === null ||
    average === 0 ||
    Number.isNaN(Number(price)) ||
    Number.isNaN(Number(average))
  ) {
    return null;
  }

  return ((price - average) / average) * 100;
}


function formatPercent(value: number | null) {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}


function getPercentClass(value: number | null) {
  if (value === null || value === undefined) {
    return "trend-neutral";
  }

  if (value > 0) {
    return "trend-bullish";
  }

  if (value < 0) {
    return "trend-bearish";
  }

  return "trend-neutral";
}


export default async function StockPage({
  params,
  searchParams,
  }: Props) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const { ticker } = await params;
  const { exchange } = await searchParams;

  const requestedTicker =
    decodeURIComponent(ticker);

  const requestedExchange =
    exchange
      ? decodeURIComponent(exchange)
      : undefined;


  let stock: Stock | null = null;
  let fetchError = false;


  try {

    stock = (await fetchStock(
      requestedTicker,
      requestedExchange
    )) as Stock | null;

  } catch {

    fetchError = true;

  }


  /*
  ==================================================
  BACKEND ERROR
  ==================================================
  */

  if (fetchError) {

    return (
      <main className="dashboard-shell">

        <header className="dashboard-header">

          <div>

            <Link
              href="/"
              className="back-link"
            >
              ← Back to dashboard
            </Link>

            <p className="eyebrow">
              STOCK INTELLIGENCE
            </p>

            <h1>
              Unable to load stock
            </h1>

            <p className="subtitle">

              The API could not return data for{" "}

              {requestedTicker.toUpperCase()}

              {requestedExchange
                ? ` (${requestedExchange.toUpperCase()})`
                : ""}.

            </p>

          </div>

        </header>


        <section className="error-banner">

          <strong>
            Backend connection error.
          </strong>

          <span>
            Make sure the FastAPI server is running
            on port 8000 and try again.
          </span>

        </section>


        <Link
          href="/"
          className="view-stock"
        >
          ← Return to dashboard
        </Link>

      </main>
    );

  }


  /*
  ==================================================
  STOCK NOT FOUND
  ==================================================
  */

  if (!stock) {

    return (
      <main className="dashboard-shell">

        <header className="dashboard-header">

          <div>

            <Link
              href="/"
              className="back-link"
            >
              ← Back to dashboard
            </Link>

            <p className="eyebrow">
              STOCK INTELLIGENCE
            </p>

            <h1>
              Stock not found
            </h1>

            <p className="subtitle">

              No intelligence record was found for{" "}

              {requestedTicker.toUpperCase()}

              {requestedExchange
                ? ` on ${requestedExchange.toUpperCase()}`
                : ""}.

            </p>

          </div>

        </header>


        <section className="error-banner">

          Stock "
          {requestedTicker.toUpperCase()}
          "

          {requestedExchange
            ? ` (${requestedExchange.toUpperCase()})`
            : ""}

          {" "}was not found in the dashboard data.

        </section>


        <Link
          href="/"
          className="view-stock"
        >
          ← Return to dashboard
        </Link>

      </main>
    );

  }


  /*
  ==================================================
  CALCULATED VALUES
  ==================================================
  */

  const score =
    stock.intelligence_score === null
      ? null
      : Number(stock.intelligence_score);


  const scoreWidth =
    score === null
      ? 0
      : Math.min(
          Math.max(score, 0),
          100
        );


  const priceVsMA20 =
    getDistancePercent(
      stock.latest_close,
      stock.ma20
    );


  const priceVsMA50 =
    getDistancePercent(
      stock.latest_close,
      stock.ma50
    );


  const signalClass =
    getSignalClass(
      stock.intelligence_signal
    );


  const trendClass =
    getTrendClass(
      stock.trend_signal
    );


  const scoreTone =
    getScoreTone(score);


  const latestTimestamp =
    stock.latest_timestamp
      ? new Date(stock.latest_timestamp)
      : null;


  const timestampLabel =
    latestTimestamp &&
    !Number.isNaN(
      latestTimestamp.getTime()
    )
      ? latestTimestamp.toISOString()
      : "Unavailable";


  /*
  ==================================================
  PAGE
  ==================================================
  */

  return (
    <main className="dashboard-shell">


      {/* ==================================================
          HEADER
          ================================================== */}

      <header className="dashboard-header stock-detail-header">

        <div>

          <Link
            href="/"
            className="back-link"
          >
            ← Back to dashboard
          </Link>


          <div className="stock-title-row">

            <div>

              <p className="eyebrow">
                STOCK INTELLIGENCE
              </p>

              <h1>
                {stock.ticker}
              </h1>

              <p className="subtitle">
                {stock.company_name}
              </p>

            </div>


            <span className="exchange-badge">
              {stock.exchange}
            </span>

          </div>

        </div>


        <div className="live-status">

          <span className="live-dot" />

          LIVE

        </div>

      </header>


      {/* ==================================================
          OVERVIEW
          ================================================== */}

      <section className="stats-grid">


        {/* CURRENT PRICE */}

        <div className="stat-card">

          <span className="stat-label">
            Current Price
          </span>

          <strong className="stat-value">

            {formatPrice(
              stock.latest_close
            )}

          </strong>

          <span className="stat-description">

            Latest available{" "}
            {stock.exchange} price

          </span>

        </div>


        {/* INTELLIGENCE SCORE */}

        <div
          className={`stat-card ${scoreTone}`}
        >

          <span className="stat-label">
            Intelligence Score
          </span>


          <div className="intelligence-score-display">

            <strong className="intelligence-score-number">

              {formatNumber(
                stock.intelligence_score
              )}

            </strong>


            <div
              className="intelligence-score-bar"
              aria-label={`Intelligence score ${
                score ?? "unavailable"
              } out of 100`}
            >

              <div
                className="intelligence-score-fill"
                style={{
                  width: `${scoreWidth}%`,
                }}
              />

            </div>


            <span className="intelligence-score-scale">
              0 — 100
            </span>

          </div>


          <span className="stat-description">

            Intelligence rank #
            {stock.intelligence_rank ?? "—"}

          </span>

        </div>


        {/* SIGNAL */}

        <div className="stat-card">

          <span className="stat-label">
            Intelligence Signal
          </span>


          <div className="overview-badge-wrapper">

            <span
              className={`signal ${signalClass}`}
            >
              {formatLabel(
                stock.intelligence_signal
              )}
            </span>

          </div>


          <span className="stat-description">
            Current model recommendation
          </span>

        </div>


        {/* CONFIDENCE */}

        <div className="stat-card">

          <span className="stat-label">
            Confidence
          </span>


          <strong className="stat-value">

            {formatLabel(
              stock.confidence_level
            )}

          </strong>


          <span className="stat-description">
            Confidence assigned to the signal
          </span>

        </div>

      </section>


      {/* ==================================================
          INTELLIGENCE SUMMARY
          ================================================== */}

      <section className="intelligence-summary">

        <div className="summary-icon">
          ✦
        </div>


        <div className="summary-content">

          <p className="eyebrow">
            INTELLIGENCE SUMMARY
          </p>


          <h2>

            {getScoreDescription(
              stock.intelligence_score
            )}

          </h2>


          <p>

            The current model shows a{" "}

            <strong>

              {formatLabel(
                stock.intelligence_signal
              )}

            </strong>

            {" "}signal, with{" "}

            <strong>

              {formatLabel(
                stock.confidence_level
              ).toLowerCase()}

            </strong>

            {" "}confidence and a{" "}

            <strong>

              {formatLabel(
                stock.trend_signal
              ).toLowerCase()}

            </strong>

            {" "}trend.

          </p>

        </div>

      </section>


      {/* ==================================================
          TECHNICAL ANALYSIS
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              TECHNICAL ANALYSIS
            </p>

            <h2>
              Market Indicators
            </h2>

            <p className="panel-description">

              Core indicators used by the
              intelligence layer.

            </p>

          </div>

        </div>


        <div className="indicator-grid">


          {/* MA20 */}

          <div className="indicator-card">

            <span className="stat-label">
              MA20
            </span>

            <strong>

              {formatPrice(
                stock.ma20
              )}

            </strong>

            <span>
              20-period moving average
            </span>

          </div>


          {/* MA50 */}

          <div className="indicator-card">

            <span className="stat-label">
              MA50
            </span>

            <strong>

              {formatPrice(
                stock.ma50
              )}

            </strong>

            <span>
              50-period moving average
            </span>

          </div>


          {/* MOMENTUM */}

          <div className="indicator-card">

            <span className="stat-label">
              Momentum
            </span>

            <strong>

              {formatNumber(
                stock.momentum_10d
              )}

            </strong>

            <span>
              10-day momentum
            </span>

          </div>


          {/* VOLATILITY */}

          <div className="indicator-card">

            <span className="stat-label">
              Volatility
            </span>

            <strong>

              {formatNumber(
                stock.volatility_20d
              )}

            </strong>

            <span>
              20-day volatility
            </span>

          </div>

        </div>


        <div className="technical-note">

          <span className="technical-note-label">
            Moving Average Signal
          </span>

          <strong>

            {getMAStatus(
              stock.latest_close,
              stock.ma20,
              stock.ma50
            )}

          </strong>

        </div>

      </section>


      {/* ==================================================
          PRICE STRUCTURE
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              PRICE STRUCTURE
            </p>

            <h2>
              Price vs Moving Averages
            </h2>

            <p className="panel-description">

              Relative position of the current
              price against MA20 and MA50.

            </p>

          </div>


          <span
            className={`trend ${trendClass}`}
          >

            {formatLabel(
              stock.trend_signal
            )}

          </span>

        </div>


        <div className="price-structure">


          {/* CURRENT PRICE */}

          <div className="price-structure-row">

            <div className="price-structure-label">

              <span className="structure-dot current-price-dot" />

              <span>
                Current Price
              </span>

            </div>


            <strong>

              {formatPrice(
                stock.latest_close
              )}

            </strong>

          </div>


          {/* MA20 */}

          <div className="price-structure-row">

            <div className="price-structure-label">

              <span className="structure-dot ma20-dot" />

              <span>
                MA20
              </span>

            </div>


            <div className="structure-value-group">

              <strong>

                {formatPrice(
                  stock.ma20
                )}

              </strong>


              <span
                className={getPercentClass(
                  priceVsMA20
                )}
              >

                {formatPercent(
                  priceVsMA20
                )}

              </span>

            </div>

          </div>


          {/* MA50 */}

          <div className="price-structure-row">

            <div className="price-structure-label">

              <span className="structure-dot ma50-dot" />

              <span>
                MA50
              </span>

            </div>


            <div className="structure-value-group">

              <strong>

                {formatPrice(
                  stock.ma50
                )}

              </strong>


              <span
                className={getPercentClass(
                  priceVsMA50
                )}
              >

                {formatPercent(
                  priceVsMA50
                )}

              </span>

            </div>

          </div>

        </div>


        {/* MARKET STRUCTURE SUMMARY */}

        <div className="price-structure-summary">

          <div>

            <span className="technical-note-label">
              Market Structure
            </span>

            <strong>

              {getMAStatus(
                stock.latest_close,
                stock.ma20,
                stock.ma50
              )}

            </strong>

          </div>


          <span
            className={`trend ${trendClass}`}
          >

            {formatLabel(
              stock.trend_signal
            )}

          </span>

        </div>

      </section>


      {/* ==================================================
          HISTORICAL DATA
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              HISTORICAL DATA
            </p>

            <h2>
              Price History
            </h2>

            <p className="panel-description">

              Historical market price movement
              for this stock.

            </p>

          </div>


          <span className="section-heading-note">
            Historical market prices
          </span>

        </div>


        <HistoryChart
          ticker={stock.ticker}
        />

      </section>


      {/* ==================================================
          SIGNAL ANALYSIS
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              INTELLIGENCE
            </p>

            <h2>
              Signal Analysis
            </h2>

            <p className="panel-description">

              The main signals currently
              associated with this stock.

            </p>

          </div>

        </div>


        <div className="signal-analysis">


          {/* SIGNAL */}

          <div className="analysis-item">

            <span className="analysis-label">
              Intelligence Signal
            </span>

            <span
              className={`signal ${signalClass}`}
            >

              {formatLabel(
                stock.intelligence_signal
              )}

            </span>

          </div>


          {/* TREND */}

          <div className="analysis-item">

            <span className="analysis-label">
              Trend
            </span>

            <span
              className={`trend ${trendClass}`}
            >

              {formatLabel(
                stock.trend_signal
              )}

            </span>

          </div>


          {/* CONFIDENCE */}

          <div className="analysis-item">

            <span className="analysis-label">
              Confidence
            </span>

            <span className="confidence">

              {formatLabel(
                stock.confidence_level
              )}

            </span>

          </div>


          {/* RANK */}

          <div className="analysis-item">

            <span className="analysis-label">
              Intelligence Rank
            </span>

            <strong className="analysis-value">

              #{stock.intelligence_rank ?? "—"}

            </strong>

          </div>

        </div>

      </section>


      {/* ==================================================
          SCORE BREAKDOWN
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              SCORE BREAKDOWN
            </p>

            <h2>
              Intelligence Score
            </h2>

            <p className="panel-description">

              Visual representation of the current
              intelligence score.

            </p>

          </div>


          <strong
            className={`score-breakdown-value ${scoreTone}`}
          >

            {formatNumber(
              stock.intelligence_score
            )}

            <span>
              /100
            </span>

          </strong>

        </div>


        <div className="score-breakdown">

          <div className="score-breakdown-track">

            <div
              className={`score-breakdown-fill ${scoreTone}`}
              style={{
                width: `${scoreWidth}%`,
              }}
            />

          </div>


          <div className="score-breakdown-scale">

            <span>
              0
            </span>

            <span>
              25
            </span>

            <span>
              50
            </span>

            <span>
              75
            </span>

            <span>
              100
            </span>

          </div>

        </div>


        <div className="score-breakdown-footer">

          <span>
            Current signal
          </span>


          <span
            className={`signal ${signalClass}`}
          >

            {formatLabel(
              stock.intelligence_signal
            )}

          </span>

        </div>

      </section>


      {/* ==================================================
          DATA QUALITY
          ================================================== */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              DATA QUALITY
            </p>

            <h2>
              Market Data Status
            </h2>

          </div>

        </div>


        <div className="data-status-grid">


          {/* EXCHANGE */}

          <div className="data-status-item">

            <span>
              Exchange
            </span>

            <strong>

              {stock.exchange || "—"}

            </strong>

          </div>


          {/* LATEST OBSERVATION */}

          <div className="data-status-item">

            <span>
              Latest observation
            </span>

            <strong>
              {timestampLabel}
            </strong>

          </div>


          {/* SIGNAL */}

          <div className="data-status-item">

            <span>
              Signal available
            </span>

            <strong>

              {stock.intelligence_signal
                ? "Yes"
                : "No"}

            </strong>

          </div>


          {/* TECHNICAL DATA */}

          <div className="data-status-item">

            <span>
              Technical data
            </span>

            <strong>

              {stock.ma20 !== null ||
              stock.ma50 !== null
                ? "Available"
                : "Partial"}

            </strong>

          </div>

        </div>

      </section>


      {/* ==================================================
          DATA TIMESTAMP
          ================================================== */}

      <div className="data-timestamp">

        <span>
          Latest market data
        </span>

        <span>
          {timestampLabel}
        </span>

      </div>


      {/* ==================================================
          FOOTER
          ================================================== */}

      <footer className="dashboard-footer">

        <span>
          Stock Intelligence
        </span>

        <span>
          {stock.ticker} • {stock.exchange}
        </span>

      </footer>

    </main>
  );
}
