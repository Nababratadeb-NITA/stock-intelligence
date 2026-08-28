import time
from datetime import datetime

from .market_ingest import main as ingest_market_data
from .validate_market_data import validate_and_promote


def run_pipeline():
    print("\n===================================")
    print("Starting market data pipeline")
    print("Time:", datetime.now())
    print("===================================")

    try:
        print("\n[1/2] Ingesting market data...")
        ingest_market_data()

        print("\n[2/2] Validating market data...")
        validate_and_promote()

        print("\nPIPELINE COMPLETED SUCCESSFULLY")

    except Exception as e:
        print("\nPIPELINE FAILED")
        print("ERROR:", e)


if __name__ == "__main__":

    print("Stock Intelligence Scheduler")
    print("Running pipeline every 60 minutes.")
    print("Press CTRL+C to stop.")

    while True:

        run_pipeline()

        print("\nWaiting 60 minutes...")
        time.sleep(60 * 60)