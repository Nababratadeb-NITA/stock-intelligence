from datetime import datetime, timedelta

from .market_data_provider import MarketDataProvider


class TestMarketDataProvider(MarketDataProvider):

    def get_eod_prices(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> list[dict]:

        base_prices = {
            "RELIANCE": 1400.00,
            "TCS": 3200.00,
            "HDFCBANK": 1850.00,
        }

        if ticker not in base_prices:
            return []

        base_price = base_prices[ticker]

        records = []

        current_date = start_date
        day_number = 0

        while current_date <= end_date:

            # Monday-Friday only
            if current_date.weekday() < 5:

                price = base_price + (day_number * 3)

                open_price = round(price, 2)
                high_price = round(price + 12, 2)
                low_price = round(price - 10, 2)
                close_price = round(price + 5, 2)

                records.append({
                    "ticker": ticker,
                    "exchange": "NSE",
                    "identifier_type": "SYMBOL",
                    "price_timestamp": datetime(
                        current_date.year,
                        current_date.month,
                        current_date.day,
                        15,
                        30
                    ),
                    "open": open_price,
                    "high": high_price,
                    "low": low_price,
                    "close": close_price,
                    "volume": 1000000 + (day_number * 10000),
                })

                day_number += 1

            current_date += timedelta(days=1)

        return records