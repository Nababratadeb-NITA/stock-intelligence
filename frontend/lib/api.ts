const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";


export type Stock = {
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


export type StockSearchResult = {
  intelligence_rank: number | null;
  ticker: string;
  company_name: string;
  exchange: string;
  latest_close: number | null;
  intelligence_score: number | null;
  trend_signal: string | null;
  intelligence_signal: string | null;
  confidence_level: string | null;
};


export type DashboardData = {
  status?: string;
  total_stocks?: number;
  stocks?: Stock[];
  [key: string]: unknown;
};


export type StatsData = {
  total_stocks?: number;
  buy_candidates?: number;
  watch_stocks?: number;
  weak_stocks?: number;
  bullish_stocks?: number;
  neutral_stocks?: number;
  bearish_stocks?: number;
  high_confidence?: number;
  [key: string]: unknown;
};


export type SignalsData = {
  [key: string]: unknown;
};


export type HealthData = {
  status: string;
  database: string;
};


async function handleResponse<T>(
  response: Response,
  errorMessage: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `${errorMessage}: ${response.status}`
    );
  }

  return response.json() as Promise<T>;
}


export async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch(
    `${API_URL}/dashboard`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<DashboardData>(
    response,
    "Failed to fetch dashboard data"
  );
}


export async function fetchStocks(): Promise<Stock[]> {
  const response = await fetch(
    `${API_URL}/stocks`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<Stock[]>(
    response,
    "Failed to fetch stocks"
  );
}


export async function fetchTopStocks(
  limit = 10
): Promise<Stock[]> {
  const response = await fetch(
    `${API_URL}/stocks/top?limit=${limit}`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<Stock[]>(
    response,
    "Failed to fetch top stocks"
  );
}


/*
==================================================
FETCH SINGLE STOCK
==================================================

Exchange is optional for backward compatibility.

Examples:

/stocks/RELIANCE

/stocks/RELIANCE?exchange=NSE

/stocks/RELIANCE?exchange=BSE
*/

export async function fetchStock(
  ticker: string,
  exchange?: string
): Promise<Stock | null> {

  const params = new URLSearchParams();

  if (exchange) {
    params.set("exchange", exchange);
  }

  const queryString = params.toString();

  const url =
    `${API_URL}/stocks/${encodeURIComponent(ticker)}` +
    (queryString ? `?${queryString}` : "");

  const response = await fetch(
    url,
    {
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  return handleResponse<Stock>(
    response,
    "Failed to fetch stock"
  );
}


export async function searchStocks(
  query: string
): Promise<StockSearchResult[]> {
  const response = await fetch(
    `${API_URL}/search?q=${encodeURIComponent(query)}`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<StockSearchResult[]>(
    response,
    "Failed to search stocks"
  );
}


export async function fetchStocksBySignal(
  signal: string
): Promise<Stock[]> {
  const response = await fetch(
    `${API_URL}/stocks/filter?signal=${encodeURIComponent(signal)}`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<Stock[]>(
    response,
    "Failed to filter stocks"
  );
}


export async function fetchStats(): Promise<StatsData> {
  const response = await fetch(
    `${API_URL}/stats`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<StatsData>(
    response,
    "Failed to fetch statistics"
  );
}


export async function fetchSignals(): Promise<SignalsData> {
  const response = await fetch(
    `${API_URL}/signals`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<SignalsData>(
    response,
    "Failed to fetch signals"
  );
}


export async function fetchHealth(): Promise<HealthData> {
  const response = await fetch(
    `${API_URL}/health`,
    {
      cache: "no-store",
    }
  );

  return handleResponse<HealthData>(
    response,
    "API health check failed"
  );
}