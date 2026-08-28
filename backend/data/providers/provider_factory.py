from .test_provider import TestMarketDataProvider
from .yahoo_provider import YahooFinanceProvider


def get_market_data_provider():

    from .provider_config import PROVIDER_NAME

    if PROVIDER_NAME == "test":
        return TestMarketDataProvider()

    if PROVIDER_NAME == "yahoo":
        return YahooFinanceProvider()

    raise ValueError(
        f"Unsupported market data provider: {PROVIDER_NAME}"
    )