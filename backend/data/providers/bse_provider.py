from datetime import datetime

from .market_data_provider import MarketDataProvider


class BSEProvider(MarketDataProvider):

    def get_eod_prices(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> list[dict]:

        # BSE data source will be connected here later.
        # We intentionally return an empty list until
        # a reliable BSE data source is configured.

        return []