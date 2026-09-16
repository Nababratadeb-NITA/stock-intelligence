import {
  bigserial,
  bigint,
  boolean,
  char,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

export const companies = pgTable("companies", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ticker: text("ticker").notNull(),
  exchange: text("exchange"),
  name: text("name").notNull(),
  sector: text("sector"),
  industry: text("industry"),
  currency: char("currency", { length: 3 }).notNull().default("USD"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("companies_ticker_exchange_unique").on(table.ticker, table.exchange),
  index("companies_ticker_idx").on(table.ticker),
]);

export const financialPeriods = pgTable("financial_periods", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  periodEnd: date("period_end").notNull(),
  periodType: text("period_type").notNull(),
  fiscalYear: integer("fiscal_year"),
  fiscalQuarter: integer("fiscal_quarter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("financial_periods_company_period_unique").on(table.companyId, table.periodEnd, table.periodType),
  index("financial_periods_company_idx").on(table.companyId, table.periodEnd),
]);

export const incomeStatements = pgTable("income_statements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  financialPeriodId: bigint("financial_period_id", { mode: "number" }).notNull().unique().references(() => financialPeriods.id, { onDelete: "cascade" }),
  revenue: numeric("revenue", { precision: 24, scale: 6 }),
  costOfRevenue: numeric("cost_of_revenue", { precision: 24, scale: 6 }),
  grossProfit: numeric("gross_profit", { precision: 24, scale: 6 }),
  operatingIncome: numeric("operating_income", { precision: 24, scale: 6 }),
  netIncome: numeric("net_income", { precision: 24, scale: 6 }),
  eps: numeric("eps", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const balanceSheets = pgTable("balance_sheets", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  financialPeriodId: bigint("financial_period_id", { mode: "number" }).notNull().unique().references(() => financialPeriods.id, { onDelete: "cascade" }),
  cashAndEquivalents: numeric("cash_and_equivalents", { precision: 24, scale: 6 }),
  totalAssets: numeric("total_assets", { precision: 24, scale: 6 }),
  totalLiabilities: numeric("total_liabilities", { precision: 24, scale: 6 }),
  totalEquity: numeric("total_equity", { precision: 24, scale: 6 }),
  totalDebt: numeric("total_debt", { precision: 24, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cashFlowStatements = pgTable("cash_flow_statements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  financialPeriodId: bigint("financial_period_id", { mode: "number" }).notNull().unique().references(() => financialPeriods.id, { onDelete: "cascade" }),
  operatingCashFlow: numeric("operating_cash_flow", { precision: 24, scale: 6 }),
  capitalExpenditures: numeric("capital_expenditures", { precision: 24, scale: 6 }),
  freeCashFlow: numeric("free_cash_flow", { precision: 24, scale: 6 }),
  investingCashFlow: numeric("investing_cash_flow", { precision: 24, scale: 6 }),
  financingCashFlow: numeric("financing_cash_flow", { precision: 24, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketPrices = pgTable("market_prices", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  priceAt: timestamp("price_at", { withTimezone: true }).notNull(),
  open: numeric("open", { precision: 18, scale: 8 }),
  high: numeric("high", { precision: 18, scale: 8 }),
  low: numeric("low", { precision: 18, scale: 8 }),
  close: numeric("close", { precision: 18, scale: 8 }).notNull(),
  adjustedClose: numeric("adjusted_close", { precision: 18, scale: 8 }),
  volume: bigint("volume", { mode: "number" }),
  currency: char("currency", { length: 3 }).notNull().default("USD"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("market_prices_company_time_unique").on(table.companyId, table.priceAt),
  index("market_prices_company_time_idx").on(table.companyId, table.priceAt),
]);

export const corporateActions = pgTable("corporate_actions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(),
  exDate: date("ex_date").notNull(),
  recordDate: date("record_date"),
  paymentDate: date("payment_date"),
  ratio: numeric("ratio", { precision: 18, scale: 8 }),
  amount: numeric("amount", { precision: 18, scale: 8 }),
  currency: char("currency", { length: 3 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("corporate_actions_company_date_type_unique").on(table.companyId, table.actionType, table.exDate),
  index("corporate_actions_company_date_idx").on(table.companyId, table.exDate),
]);

export const valuationModels = pgTable("valuation_models", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyId: bigint("company_id", { mode: "number" }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  modelType: text("model_type").notNull(),
  name: text("name").notNull(),
  assumptions: jsonb("assumptions").notNull().default({}),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("valuation_models_company_name_unique").on(table.companyId, table.name),
  index("valuation_models_company_idx").on(table.companyId),
]);

export const valuationForecasts = pgTable("valuation_forecasts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  valuationModelId: bigint("valuation_model_id", { mode: "number" }).notNull().references(() => valuationModels.id, { onDelete: "cascade" }),
  forecastYear: integer("forecast_year").notNull(),
  revenue: numeric("revenue", { precision: 24, scale: 6 }),
  ebitda: numeric("ebitda", { precision: 24, scale: 6 }),
  freeCashFlow: numeric("free_cash_flow", { precision: 24, scale: 6 }),
  discountFactor: numeric("discount_factor", { precision: 18, scale: 10 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("valuation_forecasts_model_year_unique").on(table.valuationModelId, table.forecastYear),
  index("valuation_forecasts_model_idx").on(table.valuationModelId, table.forecastYear),
]);

export const valuationResults = pgTable("valuation_results", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  valuationModelId: bigint("valuation_model_id", { mode: "number" }).notNull().references(() => valuationModels.id, { onDelete: "cascade" }),
  asOfDate: date("as_of_date").notNull(),
  enterpriseValue: numeric("enterprise_value", { precision: 24, scale: 6 }),
  equityValue: numeric("equity_value", { precision: 24, scale: 6 }),
  impliedSharePrice: numeric("implied_share_price", { precision: 24, scale: 8 }),
  upsidePercent: numeric("upside_percent", { precision: 18, scale: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("valuation_results_model_date_unique").on(table.valuationModelId, table.asOfDate),
  index("valuation_results_model_date_idx").on(table.valuationModelId, table.asOfDate),
]);

export const watchlistItems = pgTable("watchlist_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  companyId: bigint("company_id", { mode: "number" }).notNull().references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("watchlist_items_user_company_unique").on(table.userId, table.companyId),
  index("watchlist_items_user_idx").on(table.userId, table.createdAt),
]);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;

export const schema = {
  user,
  session,
  account,
  verification,
  companies,
  financialPeriods,
  incomeStatements,
  balanceSheets,
  cashFlowStatements,
  marketPrices,
  corporateActions,
  valuationModels,
  valuationForecasts,
  valuationResults,
  watchlistItems,
};
