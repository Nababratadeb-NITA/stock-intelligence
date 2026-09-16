import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  balanceSheets,
  cashFlowStatements,
  companies,
  financialPeriods,
  incomeStatements,
  marketPrices,
  valuationModels,
  valuationResults,
} from "@/lib/db/schema";

const toNumber = (value: string | null) => (value === null ? null : Number(value));

export type CompanyOverview = {
  company: typeof companies.$inferSelect;
  latestPeriod: {
    periodEnd: string;
    periodType: string;
    income: typeof incomeStatements.$inferSelect | null;
    balance: typeof balanceSheets.$inferSelect | null;
    cashFlow: typeof cashFlowStatements.$inferSelect | null;
  } | null;
  priorPeriod: { income: typeof incomeStatements.$inferSelect | null } | null;
  prices: Array<{ date: Date; close: number; volume: number | null }>;
  valuation: { modelName: string; result: typeof valuationResults.$inferSelect | null } | null;
};

export async function getCompanyOverview(ticker: string): Promise<CompanyOverview | null> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.ticker, ticker.toUpperCase()),
  });
  if (!company) return null;

  const periods = await db
    .select({ period: financialPeriods, income: incomeStatements, balance: balanceSheets, cashFlow: cashFlowStatements })
    .from(financialPeriods)
    .leftJoin(incomeStatements, eq(incomeStatements.financialPeriodId, financialPeriods.id))
    .leftJoin(balanceSheets, eq(balanceSheets.financialPeriodId, financialPeriods.id))
    .leftJoin(cashFlowStatements, eq(cashFlowStatements.financialPeriodId, financialPeriods.id))
    .where(eq(financialPeriods.companyId, company.id))
    .orderBy(desc(financialPeriods.periodEnd));

  const latest = periods[0];
  const prior = periods[1];
  const prices = await db
    .select({ date: marketPrices.priceAt, close: marketPrices.close, volume: marketPrices.volume })
    .from(marketPrices)
    .where(eq(marketPrices.companyId, company.id))
    .orderBy(desc(marketPrices.priceAt))
    .limit(60);

  const model = await db.query.valuationModels.findFirst({
    where: eq(valuationModels.companyId, company.id),
    orderBy: [desc(valuationModels.updatedAt)],
  });
  const result = model
    ? await db.query.valuationResults.findFirst({
        where: eq(valuationResults.valuationModelId, model.id),
        orderBy: [desc(valuationResults.asOfDate)],
      })
    : null;

  return {
    company,
    latestPeriod: latest
      ? { periodEnd: latest.period.periodEnd, periodType: latest.period.periodType, income: latest.income, balance: latest.balance, cashFlow: latest.cashFlow }
      : null,
    priorPeriod: prior ? { income: prior.income } : null,
    prices: prices.reverse().map((price) => ({ date: price.date, close: Number(price.close), volume: price.volume })),
    valuation: model ? { modelName: model.name, result: result ?? null } : null,
  };
}

export function calculateOverviewMetrics(data: CompanyOverview) {
  const latestIncome = data.latestPeriod?.income;
  const latestBalance = data.latestPeriod?.balance;
  const latestCash = data.latestPeriod?.cashFlow;
  const priorRevenue = toNumber(data.priorPeriod?.income?.revenue ?? null);
  const revenue = toNumber(latestIncome?.revenue ?? null);
  const netIncome = toNumber(latestIncome?.netIncome ?? null);
  const equity = toNumber(latestBalance?.totalEquity ?? null);
  const debt = toNumber(latestBalance?.totalDebt ?? null);
  const fcf = toNumber(latestCash?.freeCashFlow ?? null);
  const operatingIncome = toNumber(latestIncome?.operatingIncome ?? null);
  const assets = toNumber(latestBalance?.totalAssets ?? null);
  const current = data.prices.at(-1)?.close ?? null;
  const previous = data.prices.at(-2)?.close ?? null;

  return {
    currentPrice: current,
    dailyChange: current !== null && previous ? current - previous : null,
    dailyChangePercent: current !== null && previous ? ((current - previous) / previous) * 100 : null,
    revenueGrowth: revenue !== null && priorRevenue ? ((revenue - priorRevenue) / priorRevenue) * 100 : null,
    profitGrowth: null,
    roe: netIncome !== null && equity ? (netIncome / equity) * 100 : null,
    roce: operatingIncome !== null && assets !== null && debt !== null && equity !== null && assets - debt !== 0 ? (operatingIncome / (assets - debt)) * 100 : null,
    debtEquity: debt !== null && equity ? debt / equity : null,
    fcf,
    marketCap: null,
    pe: null,
  };
}

export function formatCompact(value: number | null, currency = "USD") {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function formatMetric(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

export function formatDate(value: string | Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export function formatCurrency(value: number | null, currency = "USD") {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

export function getPricePoints(data: CompanyOverview) {
  const max = Math.max(...data.prices.map((point) => point.close), 0);
  const min = Math.min(...data.prices.map((point) => point.close), max);
  const range = max - min || 1;
  return data.prices.map((point, index) => ({ ...point, x: data.prices.length > 1 ? (index / (data.prices.length - 1)) * 100 : 0, y: 96 - ((point.close - min) / range) * 84 }));
}

export { inArray, and };
export { formatCompact as formatNumber };
export { formatMetric as formatPercentMetric };
export { formatCurrency as formatPrice };
export { getPricePoints as pricePoints };
export { toNumber };
