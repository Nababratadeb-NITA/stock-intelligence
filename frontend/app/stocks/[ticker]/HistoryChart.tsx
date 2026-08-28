"use client";

import { useEffect, useMemo, useState } from "react";

type HistoryPoint = {
  timestamp: string;
  close: number | null;
};

type Props = {
  ticker: string;
};

export default function HistoryChart({ ticker }: Props) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError(false);

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ||
          "http://127.0.0.1:8000";

        const response = await fetch(
          `${apiUrl}/stocks/${encodeURIComponent(ticker)}/history`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const result =
          (await response.json()) as HistoryPoint[];

        const cleanedData = Array.isArray(result)
          ? result
              .filter(
                (item) =>
                  item &&
                  item.timestamp &&
                  item.close !== null &&
                  item.close !== undefined &&
                  !Number.isNaN(Number(item.close))
              )
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              )
          : [];

        setData(cleanedData);
      } catch (err) {
        console.error("History chart error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [ticker]);

  const chart = useMemo(() => {
    if (data.length < 2) {
      return null;
    }

    const width = 900;
    const height = 340;

    const leftPadding = 70;
    const rightPadding = 25;
    const topPadding = 30;
    const bottomPadding = 45;

    const chartWidth =
      width - leftPadding - rightPadding;

    const chartHeight =
      height - topPadding - bottomPadding;

    const prices = data.map((item) =>
      Number(item.close)
    );

    const min = Math.min(...prices);
    const max = Math.max(...prices);

    const range = max - min || 1;

    const points = prices.map((price, index) => {
      const x =
        leftPadding +
        (index /
          Math.max(prices.length - 1, 1)) *
          chartWidth;

      const y =
        topPadding +
        chartHeight -
        ((price - min) / range) *
          chartHeight;

      return {
        x,
        y,
        price,
      };
    });

    return {
      width,
      height,
      leftPadding,
      rightPadding,
      topPadding,
      bottomPadding,
      chartWidth,
      chartHeight,
      points,
      polyline: points
        .map((point) => `${point.x},${point.y}`)
        .join(" "),
      first: prices[0],
      last: prices[prices.length - 1],
      min,
      max,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="history-chart-state">
        <div className="loading-spinner" />

        <strong>
          Loading price history...
        </strong>

        <span>
          Fetching historical market data.
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-chart-state">
        <strong>
          Unable to load price history
        </strong>

        <span>
          The historical data endpoint could not
          be reached.
        </span>
      </div>
    );
  }

  if (!chart) {
    return (
      <div className="history-chart-state">
        <strong>
          Not enough historical data
        </strong>

        <span>
          At least two historical prices are
          required to display the chart.
        </span>
      </div>
    );
  }

  const change =
    chart.first !== 0
      ? ((chart.last - chart.first) /
          chart.first) *
        100
      : 0;

  const changeClass =
    change > 0
      ? "trend-bullish"
      : change < 0
        ? "trend-bearish"
        : "trend-neutral";

  const middlePrice =
    (chart.max + chart.min) / 2;

  const formatChartPrice = (value: number) =>
    `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );

  return (
    <div className="history-chart">

      {/* ==================================================
          CHART HEADER
          ================================================== */}

      <div className="history-chart-header">

        <div>
          <span className="stat-label">
            Historical Price
          </span>

          <strong>
            {data.length} data points
          </strong>
        </div>

        <div
          className={`history-chart-change ${changeClass}`}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </div>

      </div>


      {/* ==================================================
          CHART
          ================================================== */}

      <div className="history-chart-container">

        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${ticker} historical price chart`}
        >

          {/* TOP GRID */}

          <line
            x1={chart.leftPadding}
            y1={chart.topPadding}
            x2={
              chart.width -
              chart.rightPadding
            }
            y2={chart.topPadding}
            className="chart-grid"
          />


          {/* MIDDLE GRID */}

          <line
            x1={chart.leftPadding}
            y1={
              chart.topPadding +
              chart.chartHeight / 2
            }
            x2={
              chart.width -
              chart.rightPadding
            }
            y2={
              chart.topPadding +
              chart.chartHeight / 2
            }
            className="chart-grid"
          />


          {/* BOTTOM GRID */}

          <line
            x1={chart.leftPadding}
            y1={
              chart.topPadding +
              chart.chartHeight
            }
            x2={
              chart.width -
              chart.rightPadding
            }
            y2={
              chart.topPadding +
              chart.chartHeight
            }
            className="chart-grid"
          />


          {/* Y AXIS */}

          <line
            x1={chart.leftPadding}
            y1={chart.topPadding}
            x2={chart.leftPadding}
            y2={
              chart.topPadding +
              chart.chartHeight
            }
            className="chart-axis"
          />


          {/* X AXIS */}

          <line
            x1={chart.leftPadding}
            y1={
              chart.topPadding +
              chart.chartHeight
            }
            x2={
              chart.width -
              chart.rightPadding
            }
            y2={
              chart.topPadding +
              chart.chartHeight
            }
            className="chart-axis"
          />


          {/* TOP PRICE LABEL */}

          <text
            x={chart.leftPadding - 10}
            y={chart.topPadding + 5}
            textAnchor="end"
            className="chart-label"
          >
            {formatChartPrice(chart.max)}
          </text>


          {/* MIDDLE PRICE LABEL */}

          <text
            x={chart.leftPadding - 10}
            y={
              chart.topPadding +
              chart.chartHeight / 2 +
              5
            }
            textAnchor="end"
            className="chart-label"
          >
            {formatChartPrice(middlePrice)}
          </text>


          {/* BOTTOM PRICE LABEL */}

          <text
            x={chart.leftPadding - 10}
            y={
              chart.topPadding +
              chart.chartHeight +
              5
            }
            textAnchor="end"
            className="chart-label"
          >
            {formatChartPrice(chart.min)}
          </text>


          {/* PRICE LINE */}

          <polyline
            points={chart.polyline}
            fill="none"
            className="price-line"
          />


          {/* START DATE */}

          <text
            x={chart.leftPadding}
            y={
              chart.height -
              12
            }
            textAnchor="start"
            className="chart-label"
          >
            {formatDate(data[0].timestamp)}
          </text>


          {/* END DATE */}

          <text
            x={
              chart.width -
              chart.rightPadding
            }
            y={
              chart.height -
              12
            }
            textAnchor="end"
            className="chart-label"
          >
            {formatDate(
              data[data.length - 1].timestamp
            )}
          </text>

        </svg>

      </div>


      {/* ==================================================
          CHART FOOTER
          ================================================== */}

      <div className="history-chart-footer">

        <span>
          Low{" "}
          {formatChartPrice(chart.min)}
        </span>

        <span>
          High{" "}
          {formatChartPrice(chart.max)}
        </span>

      </div>

    </div>
  );
}