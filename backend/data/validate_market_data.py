import os

import psycopg
from dotenv import load_dotenv

from .company_resolver import resolve_company_id


load_dotenv()


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def validate_and_promote():

    with get_connection() as conn:

        with conn.cursor() as cur:

            # Find unprocessed records
            cur.execute("""
                SELECT
                    id,
                    ticker,
                    exchange,
                    identifier_type,
                    price_timestamp,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    source_id
                FROM raw_market_prices
                WHERE processed = FALSE
                ORDER BY price_timestamp;
            """)

            records = cur.fetchall()

            valid_count = 0
            invalid_count = 0

            for record in records:

                (
                    raw_id,
                    ticker,
                    exchange,
                    identifier_type,
                    price_timestamp,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    volume,
                    source_id
                ) = record

                # Basic validation
                if (
                    high_price is None
                    or low_price is None
                    or open_price is None
                    or close_price is None
                    or volume is None
                ):
                    error = "Missing price or volume data"

                elif high_price < low_price:
                    error = "High price is lower than low price"

                elif open_price < low_price or open_price > high_price:
                    error = "Open price outside high-low range"

                elif close_price < low_price or close_price > high_price:
                    error = "Close price outside high-low range"

                elif open_price < 0 or close_price < 0:
                    error = "Negative price"

                elif high_price < 0 or low_price < 0:
                    error = "Negative high/low price"

                elif volume < 0:
                    error = "Negative volume"

                else:
                    error = None

                # Timestamp validation
                if error is None and price_timestamp is None:
                    error = "Missing price timestamp"

                # Invalid record
                if error:

                    cur.execute("""
                        UPDATE raw_market_prices
                        SET
                            processed = TRUE,
                            processing_error = %s
                        WHERE id = %s;
                    """, (
                        error,
                        raw_id
                    ))

                    invalid_count += 1
                    continue

                # Resolve company automatically
                try:

                    company_id = resolve_company_id(
                        conn,
                        exchange,
                        identifier_type,
                        ticker
                    )

                except ValueError as error:

                    cur.execute("""
                        UPDATE raw_market_prices
                        SET
                            processed = TRUE,
                            processing_error = %s
                        WHERE id = %s;
                    """, (
                        str(error),
                        raw_id
                    ))

                    invalid_count += 1
                    continue

                # Insert into production table
                cur.execute("""
                    INSERT INTO market_prices (
                        company_id,
                        timestamp,
                        open,
                        high,
                        low,
                        close,
                        adjusted_close,
                        volume,
                        source_id,
                        data_frequency
                    )
                    VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (
                        company_id,
                        timestamp,
                        data_frequency
                    )
                    DO UPDATE SET
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        adjusted_close = EXCLUDED.adjusted_close,
                        volume = EXCLUDED.volume,
                        source_id = EXCLUDED.source_id;
                """, (
                    company_id,
                    price_timestamp,
                    open_price,
                    high_price,
                    low_price,
                    close_price,
                    close_price,
                    volume,
                    source_id,
                    "EOD"
                ))

                # Mark raw record as processed
                cur.execute("""
                    UPDATE raw_market_prices
                    SET
                        processed = TRUE,
                        processing_error = NULL
                    WHERE id = %s;
                """, (raw_id,))

                valid_count += 1

        conn.commit()

    print("VALIDATION COMPLETE")
    print(f"Valid records promoted: {valid_count}")
    print(f"Invalid records: {invalid_count}")


if __name__ == "__main__":
    validate_and_promote()