import csv
import io
import os

import psycopg
import requests
from dotenv import load_dotenv


load_dotenv()


NSE_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"


def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def download_nse_universe():
    print()
    print("Downloading NSE equity universe...")
    print()

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 "
            "(KHTML, like Gecko) "
            "Chrome/151.0.0.0 Safari/537.36"
        ),
        "Accept": "*/*",
        "Referer": "https://www.nseindia.com/",
    }

    response = requests.get(
        NSE_URL,
        headers=headers,
        timeout=30,
    )

    response.raise_for_status()

    return response.content


def clean(value):
    if value is None:
        return ""

    return str(value).strip()


def import_nse_universe():

    stocks_found = 0
    companies_created = 0
    identifiers_created = 0
    already_existed = 0
    skipped = 0
    errors = 0

    # =========================================================
    # DOWNLOAD NSE DATA
    # =========================================================

    try:
        csv_bytes = download_nse_universe()

    except Exception as exc:
        print()
        print("ERROR downloading NSE universe:")
        print(exc)
        return

    # =========================================================
    # READ CSV
    # =========================================================

    try:
        text = csv_bytes.decode(
            "utf-8-sig",
            errors="replace",
        )

        reader = csv.DictReader(
            io.StringIO(text)
        )

        if not reader.fieldnames:
            raise ValueError(
                "NSE CSV contains no headers."
            )

        print("NSE columns detected:")
        print(", ".join(reader.fieldnames))
        print()

    except Exception as exc:
        print()
        print("ERROR reading NSE data:")
        print(exc)
        return

    # =========================================================
    # DATABASE
    # =========================================================

    conn = get_connection()

    try:

        for row in reader:

            stocks_found += 1

            symbol = clean(
                row.get("SYMBOL")
            ).upper()

            company_name = clean(
                row.get("NAME OF COMPANY")
            )

            isin = clean(
                row.get("ISIN NUMBER")
            )

            if not symbol:
                skipped += 1
                continue

            if not company_name:
                company_name = symbol

            try:

                with conn.transaction():

                    # =================================================
                    # CHECK EXISTING COMPANY
                    # =================================================

                    with conn.cursor() as cur:

                        cur.execute(
                            """
                            SELECT id
                            FROM companies
                            WHERE ticker = %s
                              AND exchange = %s
                            LIMIT 1;
                            """,
                            (
                                symbol,
                                "NSE",
                            ),
                        )

                        existing_company = cur.fetchone()

                    # =================================================
                    # CREATE OR UPDATE COMPANY
                    # =================================================

                    if existing_company:

                        company_id = existing_company[0]

                        with conn.cursor() as cur:

                            cur.execute(
                                """
                                UPDATE companies
                                SET
                                    company_name = %s,
                                    isin = NULLIF(%s, ''),
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s;
                                """,
                                (
                                    company_name,
                                    isin,
                                    company_id,
                                ),
                            )

                        already_existed += 1

                    else:

                        with conn.cursor() as cur:

                            cur.execute(
                                """
                                INSERT INTO companies (
                                    ticker,
                                    isin,
                                    company_name,
                                    exchange,
                                    country,
                                    currency
                                )
                                VALUES (
                                    %s,
                                    NULLIF(%s, ''),
                                    %s,
                                    %s,
                                    %s,
                                    %s
                                )
                                RETURNING id;
                                """,
                                (
                                    symbol,
                                    isin,
                                    company_name,
                                    "NSE",
                                    "India",
                                    "INR",
                                ),
                            )

                            company_id = cur.fetchone()[0]

                        companies_created += 1

                    # =================================================
                    # CHECK IDENTIFIER
                    # =================================================

                    with conn.cursor() as cur:

                        cur.execute(
                            """
                            SELECT id
                            FROM company_identifiers
                            WHERE exchange = %s
                              AND identifier_type = %s
                              AND identifier_value = %s
                            LIMIT 1;
                            """,
                            (
                                "NSE",
                                "SYMBOL",
                                symbol,
                            ),
                        )

                        existing_identifier = cur.fetchone()

                    # =================================================
                    # CREATE IDENTIFIER
                    # =================================================

                    if existing_identifier:

                        already_existed += 1

                    else:

                        with conn.cursor() as cur:

                            cur.execute(
                                """
                                INSERT INTO company_identifiers (
                                    company_id,
                                    exchange,
                                    identifier_type,
                                    identifier_value
                                )
                                VALUES (
                                    %s,
                                    %s,
                                    %s,
                                    %s
                                );
                                """,
                                (
                                    company_id,
                                    "NSE",
                                    "SYMBOL",
                                    symbol,
                                ),
                            )

                        identifiers_created += 1

            except Exception as exc:

                errors += 1

                print(
                    f"ERROR: {symbol} - {exc}"
                )

                continue

    finally:

        conn.close()

    # =========================================================
    # FINAL RESULT
    # =========================================================

    print()
    print("NSE UNIVERSE IMPORT COMPLETE")
    print("================================")
    print(
        f"Stocks found:          {stocks_found}"
    )
    print(
        f"Companies created:     {companies_created}"
    )
    print(
        f"Identifiers created:   {identifiers_created}"
    )
    print(
        f"Already existed:       {already_existed}"
    )
    print(
        f"Skipped:               {skipped}"
    )
    print(
        f"Errors:                {errors}"
    )
    print()


if __name__ == "__main__":
    import_nse_universe()