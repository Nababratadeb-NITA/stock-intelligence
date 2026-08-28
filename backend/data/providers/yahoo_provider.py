from datetime import datetime

import yfinance as yf

from .market_data_provider import MarketDataProvider


class YahooFinanceProvider(MarketDataProvider):

    def get_eod_prices(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> list[dict]:

        # ---------------------------------------------------------
        # Yahoo Finance symbol mapping
        #
        # NSE symbols automatically use .NS
        # BSE symbols automatically use .BO
        #
        # No manual list of thousands of stocks is required.
        # ---------------------------------------------------------

        if ticker.endswith("_BSE"):
            yahoo_symbol = (
                ticker.replace("_BSE", "") + ".BO"
            )
            exchange = "BSE"

            actual_ticker = ticker.replace(
                "_BSE",
                ""
            )

        else:
            yahoo_symbol = ticker + ".NS"
            exchange = "NSE"

            actual_ticker = ticker

        # ---------------------------------------------------------
        # Fetch data from Yahoo Finance
        # ---------------------------------------------------------

        yahoo_ticker = yf.Ticker(
            yahoo_symbol
        )

        data = yahoo_ticker.history(
            start=start_date.strftime("%Y-%m-%d"),
            end=end_date.strftime("%Y-%m-%d"),
            auto_adjust=False,
        )

        if data.empty:
            return []

        records = []

        # ---------------------------------------------------------
        # Convert Yahoo data into our standard format
        # ---------------------------------------------------------

        for timestamp, row in data.iterrows():

            open_value = row["Open"]
            high_value = row["High"]
            low_value = row["Low"]
            close_value = row["Close"]
            volume_value = row["Volume"]

            # Skip invalid rows
            if (
                open_value is None
                or high_value is None
                or low_value is None
                or close_value is None
            ):
                continue

            records.append({
                "ticker": actual_ticker,
                "exchange": exchange,
                "identifier_type": "SYMBOL",
                "price_timestamp": timestamp.to_pydatetime(),
                "open": float(open_value),
                "high": float(high_value),
                "low": float(low_value),
                "close": float(close_value),
                "volume": int(volume_value),
            })

        return records