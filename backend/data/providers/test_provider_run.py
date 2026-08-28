from datetime import datetime

from .test_provider import TestMarketDataProvider


provider = TestMarketDataProvider()

prices = provider.get_eod_prices(
    "RELIANCE",
    datetime(2026, 8, 25),
    datetime(2026, 8, 26)
)

print(f"Received {len(prices)} records.")

for price in prices:
    print(
        price["ticker"],
        price["price_timestamp"],
        price["close"]
    )