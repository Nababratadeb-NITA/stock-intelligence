import os

from dotenv import load_dotenv


load_dotenv()


PROVIDER_NAME = os.getenv(
    "MARKET_DATA_PROVIDER",
    "test"
)

NSE_API_KEY = os.getenv(
    "NSE_API_KEY"
)

BSE_API_KEY = os.getenv(
    "BSE_API_KEY"
)