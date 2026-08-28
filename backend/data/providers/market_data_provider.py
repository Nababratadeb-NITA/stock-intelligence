from abc import ABC, abstractmethod
from datetime import datetime


class MarketDataProvider(ABC):

    @abstractmethod
    def get_eod_prices(
        self,
        ticker: str,
        start_date: datetime,
        end_date: datetime
    ) -> list[dict]:
        """
        Fetch end-of-day prices for a company.
        """
        raise NotImplementedError