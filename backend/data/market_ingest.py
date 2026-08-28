import json
import os
from datetime import datetime

import psycopg
from dotenv import load_dotenv

from .providers.provider_factory import get_market_data_provider


load_dotenv()


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def get_source_id(conn, exchange):
    source_map = {
        "NSE": 1,
        "BSE": 2,
    }

    if exchange not in source_map:
        raise ValueError(
            f"Unsupported exchange: {exchange}"
        )

    return source_map[exchange]


def get_nse_symbols(conn):
    """
    Get all NSE stock symbols from company_identifiers.

    No hardcoded stock list is used.
    """

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT identifier_value
            FROM company_identifiers
            WHERE exchange = %s
              AND identifier_type = %s
              AND identifier_value IS NOT NULL
              AND identifier_value <> ''
            ORDER BY identifier_value;
            """,
            (
                "NSE",
                "SYMBOL",
            ),
        )

        rows = cur.fetchall()

    return [
        row[0]
        for row in rows
        if row[0]
    ]


def insert_raw_market_price(
    conn,
    source_id,
    data,
):
    """
    Insert one market-price record into raw_market_prices.

    Existing records are updated instead of duplicated.
    """

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO raw_market_prices (
                source_id,
                ticker,
                exchange,
                identifier_type,
                price_timestamp,
                open,
                high,
                low,
                close,
                volume,
                raw_payload
            )
            VALUES (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            ON CONFLICT (
                ticker,
                exchange,
                price_timestamp
            )
            DO UPDATE SET
                source_id = EXCLUDED.source_id,
                identifier_type = EXCLUDED.identifier_type,
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume,
                raw_payload = EXCLUDED.raw_payload,
                processed = FALSE,
                processing_error = NULL;
            """,
            (
                source_id,
                data["ticker"],
                data["exchange"],
                data["identifier_type"],
                data["price_timestamp"],
                data["open"],
                data["high"],
                data["low"],
                data["close"],
                data["volume"],
                json.dumps(
                    data,
                    default=str,
                ),
            ),
        )


def main():

    print()
    print("=" * 60)
    print("MARKET DATA INGESTION")
    print("=" * 60)
    print()

    provider = get_market_data_provider()

    total_companies = 0
    successful_companies = 0
    failed_companies = 0
    empty_companies = 0
    total_records = 0

    with get_connection() as conn:

        # =====================================================
        # GET NSE UNIVERSE
        # =====================================================

        tickers = get_nse_symbols(conn)

        total_companies = len(tickers)

        print(
            f"Companies found:       {total_companies}"
        )

        print()

        if not tickers:
            print(
                "ERROR: No NSE companies found "
                "in company_identifiers."
            )
            return

        # =====================================================
        # DATE RANGE
        # =====================================================

        start_date = datetime(
            2026,
            7,
            1,
        )

        end_date = datetime(
            2026,
            8,
            26,
        )

        print(
            f"Date range:            "
            f"{start_date.date()} -> {end_date.date()}"
        )

        print()
        print("=" * 60)
        print()

        # =====================================================
        # PROCESS EVERY NSE COMPANY
        # =====================================================

        for index, ticker in enumerate(
            tickers,
            start=1,
        ):

            print(
                f"[{index}/{total_companies}] "
                f"Processing {ticker}..."
            )

            try:

                prices = provider.get_eod_prices(
                    ticker=ticker,
                    start_date=start_date,
                    end_date=end_date,
                )

                # -------------------------------------------------
                # Yahoo returned no data
                # -------------------------------------------------

                if not prices:

                    empty_companies += 1

                    print(
                        "    SKIPPED - no market prices"
                    )

                    continue

                company_records = 0

                # -------------------------------------------------
                # Insert every price record
                # -------------------------------------------------

                for price in prices:

                    exchange = price["exchange"]

                    source_id = get_source_id(
                        conn,
                        exchange,
                    )

                    insert_raw_market_price(
                        conn,
                        source_id,
                        price,
                    )

                    company_records += 1

                # -------------------------------------------------
                # Commit THIS company
                #
                # This prevents one bad company from
                # breaking the entire ingestion process.
                # -------------------------------------------------

                conn.commit()

                successful_companies += 1
                total_records += company_records

                print(
                    f"    OK - "
                    f"{company_records} records"
                )

            except Exception as exc:

                failed_companies += 1

                # -------------------------------------------------
                # IMPORTANT
                #
                # PostgreSQL transactions become aborted after
                # an error. Rollback clears that failed transaction
                # so the next company can continue.
                # -------------------------------------------------

                conn.rollback()

                print(
                    f"    ERROR - {exc}"
                )

        # =====================================================
        # FINAL COMMIT
        # =====================================================

        conn.commit()

    # =========================================================
    # FINAL SUMMARY
    # =========================================================

    print()
    print("=" * 60)
    print("MARKET DATA INGESTION COMPLETE")
    print("=" * 60)

    print(
        f"Companies found:       {total_companies}"
    )

    print(
        f"Companies successful:  {successful_companies}"
    )

    print(
        f"Companies skipped:     {empty_companies}"
    )

    print(
        f"Companies failed:      {failed_companies}"
    )

    print(
        f"Records processed:     {total_records}"
    )

    print("=" * 60)
    print()


if __name__ == "__main__":
    main()