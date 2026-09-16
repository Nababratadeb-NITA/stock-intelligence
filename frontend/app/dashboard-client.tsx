"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "@/lib/auth-client";

import {
  fetchDashboard,
  fetchStats,
  type Stock,
} from "@/lib/api";


type Stats = {
  total_stocks: number;
  buy_candidates: number;
  watch_stocks: number;
  weak_stocks: number;
  bullish_stocks: number;
  neutral_stocks: number;
  bearish_stocks: number;
  high_confidence: number;
};


type DashboardResponse = {
  status: string;
  total_stocks: number;
  stocks: Stock[];
};


type FilterType =
  | "ALL"
  | "BUY_CANDIDATE"
  | "WATCH"
  | "WEAK";


function formatPrice(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function formatScore(value: number | null) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toFixed(1);
}


function formatSignal(signal: string | null) {
  if (!signal) {
    return "—";
  }

  return signal.replaceAll("_", " ");
}


function formatLabel(value: string | null) {
  if (!value) {
    return "—";
  }

  return value.replaceAll("_", " ");
}


function signalClass(signal: string | null) {
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


function trendClass(trend: string | null) {
  if (trend === "BULLISH") {
    return "trend-bullish";
  }

  if (trend === "BEARISH") {
    return "trend-bearish";
  }

  return "trend-neutral";
}


export default function Home({ userName }: { userName: string }) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


  async function loadDashboard(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const [dashboardData, statsData] = await Promise.all([
        fetchDashboard(),
        fetchStats(),
      ]);

      const dashboard = dashboardData as DashboardResponse;
      const statistics = statsData as Stats;

      setStocks(
        Array.isArray(dashboard.stocks)
          ? dashboard.stocks
          : []
      );

      setStats(statistics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load Stock Intelligence data. Make sure the FastAPI backend is running."
      );

      if (!isRefresh) {
        setStocks([]);
        setStats(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  useEffect(() => {
    loadDashboard();
  }, []);


  const filteredStocks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const result = stocks.filter((stock) => {
      const matchesSearch =
        !normalizedSearch ||
        stock.ticker.toLowerCase().includes(normalizedSearch) ||
        stock.company_name.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        filter === "ALL" ||
        stock.intelligence_signal === filter;

      return matchesSearch && matchesFilter;
    });

    return [...result].sort(
      (a, b) =>
        (b.intelligence_score ?? -Infinity) -
        (a.intelligence_score ?? -Infinity)
    );
  }, [stocks, search, filter]);


  const topStocks = useMemo(() => {
    return [...stocks]
      .filter(
        (stock) =>
          stock.intelligence_score !== null &&
          stock.intelligence_score !== undefined
      )
      .sort(
        (a, b) =>
          (b.intelligence_score ?? -Infinity) -
          (a.intelligence_score ?? -Infinity)
      )
      .slice(0, 3);
  }, [stocks]);


  const filterCounts = useMemo(() => {
    return {
      ALL: stocks.length,

      BUY_CANDIDATE: stocks.filter(
        (stock) =>
          stock.intelligence_signal === "BUY_CANDIDATE"
      ).length,

      WATCH: stocks.filter(
        (stock) =>
          stock.intelligence_signal === "WATCH"
      ).length,

      WEAK: stocks.filter(
        (stock) =>
          stock.intelligence_signal === "WEAK"
      ).length,
    };
  }, [stocks]);


  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";


  return (
    <main className="dashboard-shell">

      {/* -------------------------------------------------- */}
      {/* HEADER */}
      {/* -------------------------------------------------- */}

      <header className="dashboard-header">

        <div className="dashboard-title-block">

          <p className="eyebrow">
            MARKET INTELLIGENCE
          </p>

          <h1>
            Stock Intelligence
          </h1>

          <p className="subtitle">
            Data-driven market insights for
            smarter investment decisions.
          </p>

        </div>


        <div className="header-actions">

          <div className="last-updated">
            <span className="status-dot" />

            <span>
              Updated {updatedLabel}
            </span>
          </div>


          <button
            type="button"
            className="refresh-button"
            onClick={() => loadDashboard(true)}
            disabled={loading || refreshing}
          >

            <span
              className={
                refreshing
                  ? "refresh-icon spinning"
                  : "refresh-icon"
              }
            >
              ↻
            </span>

            {refreshing
              ? "Refreshing"
              : "Refresh"}

          </button>


          <div className="live-status">
            <span className="live-dot" />
            LIVE
          </div>

          <span className="user-greeting">{userName}</span>
          <button
            type="button"
            className="logout-button"
            onClick={async () => {
              await signOut();
              window.location.assign("/login");
            }}
          >
            Sign out
          </button>

        </div>

      </header>


      {/* -------------------------------------------------- */}
      {/* ERROR */}
      {/* -------------------------------------------------- */}

      {error && (

        <div className="error-banner">

          <div>

            <strong>
              Connection problem
            </strong>

            <span>
              {error}
            </span>

          </div>


          <button
            type="button"
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
          >
            Retry
          </button>

        </div>

      )}


      {/* -------------------------------------------------- */}
      {/* MARKET SNAPSHOT */}
      {/* -------------------------------------------------- */}

      <section className="market-snapshot">

        <div className="snapshot-intro">

          <p className="eyebrow">
            MARKET SNAPSHOT
          </p>

          <strong>
            Intelligence overview
          </strong>

          <span>
            Current signals across your tracked universe.
          </span>

        </div>


        <div className="snapshot-metric">

          <span>
            Bullish
          </span>

          <strong>
            {loading
              ? "—"
              : stats?.bullish_stocks ?? 0}
          </strong>

        </div>


        <div className="snapshot-metric">

          <span>
            Neutral
          </span>

          <strong>
            {loading
              ? "—"
              : stats?.neutral_stocks ?? 0}
          </strong>

        </div>


        <div className="snapshot-metric">

          <span>
            Bearish
          </span>

          <strong>
            {loading
              ? "—"
              : stats?.bearish_stocks ?? 0}
          </strong>

        </div>


        <div className="snapshot-metric">

          <span>
            High Confidence
          </span>

          <strong>
            {loading
              ? "—"
              : stats?.high_confidence ?? 0}
          </strong>

        </div>

      </section>


      {/* -------------------------------------------------- */}
      {/* STATISTICS */}
      {/* -------------------------------------------------- */}

      <section className="stats-grid">

        <div className="stat-card">

          <span className="stat-label">
            Total Stocks
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.total_stocks ?? 0}
          </strong>

          <span className="stat-description">
            Stocks analyzed
          </span>

        </div>


        <button
          type="button"
          className={`stat-card stat-card-button stat-buy ${
            filter === "BUY_CANDIDATE"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFilter("BUY_CANDIDATE")
          }
        >

          <span className="stat-label">
            Buy Candidates
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.buy_candidates ?? 0}
          </strong>

          <span className="stat-description">
            Positive intelligence signals
          </span>

        </button>


        <button
          type="button"
          className={`stat-card stat-card-button stat-watch ${
            filter === "WATCH"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFilter("WATCH")
          }
        >

          <span className="stat-label">
            Watch
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.watch_stocks ?? 0}
          </strong>

          <span className="stat-description">
            Require attention
          </span>

        </button>


        <button
          type="button"
          className={`stat-card stat-card-button stat-weak ${
            filter === "WEAK"
              ? "selected"
              : ""
          }`}
          onClick={() =>
            setFilter("WEAK")
          }
        >

          <span className="stat-label">
            Weak
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.weak_stocks ?? 0}
          </strong>

          <span className="stat-description">
            Weak intelligence signals
          </span>

        </button>


        <div className="stat-card">

          <span className="stat-label">
            Bullish
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.bullish_stocks ?? 0}
          </strong>

          <span className="stat-description">
            Positive trend
          </span>

        </div>


        <div className="stat-card">

          <span className="stat-label">
            High Confidence
          </span>

          <strong className="stat-value">
            {loading
              ? "—"
              : stats?.high_confidence ?? 0}
          </strong>

          <span className="stat-description">
            High-confidence signals
          </span>

        </div>

      </section>


      {/* -------------------------------------------------- */}
      {/* TOP INTELLIGENCE PICKS */}
      {/* -------------------------------------------------- */}

      {!loading && topStocks.length > 0 && (

        <section className="top-picks-section">

          <div className="section-heading">

            <div>

              <p className="eyebrow">
                TOP SIGNALS
              </p>

              <h2>
                Intelligence Picks
              </h2>

            </div>

            <span className="section-heading-note">
              Highest-scoring stocks
            </span>

          </div>


          <div className="top-picks-grid">

            {topStocks.map((stock, index) => (

              <Link
                key={`${stock.ticker}-${stock.exchange}`}
                href={`/stocks/${encodeURIComponent(
                  stock.ticker
                )}?exchange=${encodeURIComponent(
                  stock.exchange
                )}`}
                className="top-pick-card"
              >

                <div className="top-pick-header">

                  <span className="top-pick-rank">
                    #{index + 1}
                  </span>

                  <span className="exchange">
                    {stock.exchange}
                  </span>

                </div>


                <div className="top-pick-company">

                  <strong>
                    {stock.ticker}
                  </strong>

                  <span>
                    {stock.company_name}
                  </span>

                </div>


                <div className="top-pick-score">

                  <div>

                    <span>
                      Intelligence Score
                    </span>

                    <strong>
                      {formatScore(
                        stock.intelligence_score
                      )}
                    </strong>

                  </div>


                  <span
                    className={`signal ${signalClass(
                      stock.intelligence_signal
                    )}`}
                  >
                    {formatSignal(
                      stock.intelligence_signal
                    )}
                  </span>

                </div>


                <div className="top-pick-footer">

                  <span>
                    {formatPrice(
                      stock.latest_close
                    )}
                  </span>

                  <span
                    className={`trend ${trendClass(
                      stock.trend_signal
                    )}`}
                  >
                    {formatLabel(
                      stock.trend_signal
                    )}
                  </span>

                </div>

              </Link>

            ))}

          </div>

        </section>

      )}


      {/* -------------------------------------------------- */}
      {/* STOCK RANKINGS */}
      {/* -------------------------------------------------- */}

      <section className="panel">

        <div className="panel-header">

          <div>

            <p className="eyebrow">
              RANKINGS
            </p>

            <h2>
              Intelligence Rankings
            </h2>

          </div>


          <div className="panel-meta">

            <span className="stock-count">

              {filteredStocks.length} of{" "}
              {stocks.length} stocks

            </span>


            {filter !== "ALL" && (

              <button
                type="button"
                className="reset-filter"
                onClick={() =>
                  setFilter("ALL")
                }
              >
                Clear filter
              </button>

            )}

          </div>

        </div>


        {/* ------------------------------------------------ */}
        {/* SEARCH + FILTERS */}
        {/* ------------------------------------------------ */}

        <div className="controls">

          <div className="search-wrapper">

            <span className="search-icon">
              ⌕
            </span>


            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search ticker or company..."
              className="search-input"
              aria-label="Search stocks"
            />


            {search && (

              <button
                type="button"
                className="clear-search"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                ×
              </button>

            )}

          </div>


          <div className="filter-buttons">

            <button
              type="button"
              className={
                filter === "ALL"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("ALL")
              }
            >
              All
              <span>
                {filterCounts.ALL}
              </span>
            </button>


            <button
              type="button"
              className={
                filter === "BUY_CANDIDATE"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("BUY_CANDIDATE")
              }
            >
              Buy Candidates

              <span>
                {filterCounts.BUY_CANDIDATE}
              </span>

            </button>


            <button
              type="button"
              className={
                filter === "WATCH"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("WATCH")
              }
            >
              Watch

              <span>
                {filterCounts.WATCH}
              </span>

            </button>


            <button
              type="button"
              className={
                filter === "WEAK"
                  ? "filter-button active"
                  : "filter-button"
              }
              onClick={() =>
                setFilter("WEAK")
              }
            >
              Weak

              <span>
                {filterCounts.WEAK}
              </span>

            </button>

          </div>

        </div>


        {/* ------------------------------------------------ */}
        {/* TABLE */}
        {/* ------------------------------------------------ */}

        {loading ? (

          <div className="loading-state">

            <div className="loading-spinner" />

            <strong>
              Loading market intelligence...
            </strong>

            <span>
              Connecting to the intelligence engine.
            </span>

          </div>

        ) : filteredStocks.length === 0 ? (

          <div className="empty-state">

            <div className="empty-state-icon">
              ⌕
            </div>

            <strong>
              No stocks found
            </strong>

            <span>
              Try a different search or filter.
            </span>


            {(search || filter !== "ALL") && (

              <button
                type="button"
                className="empty-reset"
                onClick={() => {
                  setSearch("");
                  setFilter("ALL");
                }}
              >
                Reset view
              </button>

            )}

          </div>

        ) : (

          <div className="table-wrapper">

            <table>

              <thead>

                <tr>

                  <th>
                    Rank
                  </th>

                  <th>
                    Company
                  </th>

                  <th>
                    Exchange
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Score
                  </th>

                  <th>
                    Trend
                  </th>

                  <th>
                    Signal
                  </th>

                  <th>
                    Confidence
                  </th>

                  <th aria-label="View"></th>

                </tr>

              </thead>


              <tbody>

                {filteredStocks.map((stock) => (

                  <tr
                    key={`${stock.ticker}-${stock.exchange}`}
                    className="stock-row"
                  >

                    <td>

                      <span className="rank">
                        #{stock.intelligence_rank ?? "—"}
                      </span>

                    </td>


                    <td>

                      <Link
                        href={`/stocks/${encodeURIComponent(
                          stock.ticker
                        )}?exchange=${encodeURIComponent(
                          stock.exchange
                        )}`}
                        className="company-link"
                      >

                        <div className="company-cell">

                          <strong>
                            {stock.ticker}
                          </strong>

                          <span>
                            {stock.company_name}
                          </span>

                        </div>

                      </Link>

                    </td>


                    <td>

                      <span className="exchange">
                        {stock.exchange}
                      </span>

                    </td>


                    <td className="price">

                      {formatPrice(
                        stock.latest_close
                      )}

                    </td>


                    <td>

                      <span className="score">

                        {formatScore(
                          stock.intelligence_score
                        )}

                      </span>

                    </td>


                    <td>

                      <span
                        className={`trend ${trendClass(
                          stock.trend_signal
                        )}`}
                      >

                        {formatLabel(
                          stock.trend_signal
                        )}

                      </span>

                    </td>


                    <td>

                      <span
                        className={`signal ${signalClass(
                          stock.intelligence_signal
                        )}`}
                      >

                        {formatSignal(
                          stock.intelligence_signal
                        )}

                      </span>

                    </td>


                    <td>

                      <span className="confidence">

                        {formatLabel(
                          stock.confidence_level
                        )}

                      </span>

                    </td>


                    <td>

                      <Link
                        href={`/stocks/${encodeURIComponent(
                          stock.ticker
                        )}?exchange=${encodeURIComponent(
                          stock.exchange
                        )}`}
                        className="view-stock"
                        aria-label={`View ${stock.ticker}`}
                      >
                        →
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* -------------------------------------------------- */}
      {/* FOOTER */}
      {/* -------------------------------------------------- */}

      <footer className="dashboard-footer">

        <span>
          Stock Intelligence
        </span>

        <span>
          Powered by market data & intelligence
        </span>

      </footer>

    </main>
  );
}
