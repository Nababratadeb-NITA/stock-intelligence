import os
import math

import psycopg
from dotenv import load_dotenv


load_dotenv()


# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def get_connection():
    return psycopg.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


# ============================================================================
# TECHNICAL CALCULATIONS
# ============================================================================

def calculate_ma(prices, period):
    if len(prices) < period:
        return None

    return sum(prices[-period:]) / period


def calculate_momentum(prices, period=10):
    if len(prices) <= period:
        return None

    previous = prices[-period - 1]
    current = prices[-1]

    if previous == 0:
        return None

    return ((current - previous) / previous) * 100


def calculate_volatility(prices, period=20):
    if len(prices) < period + 1:
        return None

    recent_prices = prices[-(period + 1):]

    returns = []

    for i in range(1, len(recent_prices)):
        previous = recent_prices[i - 1]
        current = recent_prices[i]

        if previous == 0:
            continue

        daily_return = (
            (current - previous) / previous
        ) * 100

        returns.append(daily_return)

    if len(returns) < 2:
        return None

    mean = sum(returns) / len(returns)

    variance = sum(
        (value - mean) ** 2
        for value in returns
    ) / len(returns)

    return math.sqrt(variance)


# ============================================================================
# TREND
# ============================================================================

def calculate_trend(price, ma20, ma50):

    if (
        price is None
        or ma20 is None
        or ma50 is None
    ):
        return "NEUTRAL"

    if price > ma20 and ma20 > ma50:
        return "BULLISH"

    if price < ma20 and ma20 < ma50:
        return "BEARISH"

    return "NEUTRAL"


# ============================================================================
# INTELLIGENCE SCORE
# ============================================================================

def calculate_score(
    price,
    ma20,
    ma50,
    momentum,
    volatility,
):

    if (
        price is None
        or ma20 is None
        or ma50 is None
        or momentum is None
    ):
        return None

    score = 50.0

    # ------------------------------------------------------------------------
    # Price vs MA20
    # ------------------------------------------------------------------------

    if price > ma20:
        score += 10
    else:
        score -= 10

    # ------------------------------------------------------------------------
    # MA20 vs MA50
    # ------------------------------------------------------------------------

    if ma20 > ma50:
        score += 15
    else:
        score -= 15

    # ------------------------------------------------------------------------
    # Momentum
    # ------------------------------------------------------------------------

    if momentum > 5:
        score += 15

    elif momentum > 0:
        score += 8

    elif momentum < -5:
        score -= 15

    else:
        score -= 8

    # ------------------------------------------------------------------------
    # Volatility
    # ------------------------------------------------------------------------

    if volatility is not None:

        if volatility < 2:
            score += 5

        elif volatility > 5:
            score -= 5

    return max(
        0,
        min(
            100,
            round(score, 2),
        ),
    )


# ============================================================================
# INTELLIGENCE SIGNAL
# ============================================================================

def calculate_signal(score):

    if score is None:
        return None

    if score >= 70:
        return "BUY_CANDIDATE"

    if score >= 50:
        return "WATCH"

    return "WEAK"


# ============================================================================
# PROCESS ONE COMPANY
# ============================================================================

def process_company(
    connection,
    company_id,
    ticker,
    exchange,
):

    with connection.cursor() as cursor:

        # --------------------------------------------------------------------
        # Get historical market prices
        #
        # company_id comes from the companies table.
        # market_prices contains the actual historical prices.
        # --------------------------------------------------------------------

        cursor.execute(
            """
            SELECT
                close
            FROM market_prices
            WHERE company_id = %s
              AND close IS NOT NULL
            ORDER BY timestamp ASC;
            """,
            (company_id,),
        )

        rows = cursor.fetchall()

        prices = [
            float(row[0])
            for row in rows
        ]

        # --------------------------------------------------------------------
        # No prices
        # --------------------------------------------------------------------

        if not prices:

            print(
                f"SKIPPED: {ticker} ({exchange}) - "
                "no market prices"
            )

            return "skipped"

        # --------------------------------------------------------------------
        # Latest price
        # --------------------------------------------------------------------

        price = prices[-1]

        # --------------------------------------------------------------------
        # Calculate indicators
        # --------------------------------------------------------------------

        ma20 = calculate_ma(
            prices,
            20,
        )

        ma50 = calculate_ma(
            prices,
            50,
        )

        momentum = calculate_momentum(
            prices,
            10,
        )

        volatility = calculate_volatility(
            prices,
            20,
        )

        # --------------------------------------------------------------------
        # Calculate intelligence
        # --------------------------------------------------------------------

        trend = calculate_trend(
            price,
            ma20,
            ma50,
        )

        score = calculate_score(
            price,
            ma20,
            ma50,
            momentum,
            volatility,
        )

        signal = calculate_signal(
            score,
        )

        # --------------------------------------------------------------------
        # IMPORTANT
        #
        # investor_stock_dashboard is a VIEW.
        #
        # stock_intelligence_with_confidence is also a VIEW.
        #
        # Therefore we MUST NOT update either of them.
        #
        # The actual writable table is:
        #
        #     stock_intelligence_final
        #
        # confidence_level is calculated by the view, so we also
        # MUST NOT update confidence_level here.
        # --------------------------------------------------------------------

        cursor.execute(
            """
            UPDATE stock_intelligence_final
            SET
                ma20 = %s,
                ma50 = %s,
                momentum_10d = %s,
                volatility_20d = %s,
                trend_signal = %s,
                intelligence_score = %s,
                intelligence_signal = %s
            WHERE company_id = %s;
            """,
            (
                ma20,
                ma50,
                momentum,
                volatility,
                trend,
                score,
                signal,
                company_id,
            ),
        )

        updated_rows = cursor.rowcount

        # --------------------------------------------------------------------
        # Dashboard row does not exist
        # --------------------------------------------------------------------

        if updated_rows == 0:

            print(
                f"WARNING: {ticker} ({exchange}) - "
                "stock_intelligence_final row not found"
            )

            return "skipped"

        # --------------------------------------------------------------------
        # Success
        # --------------------------------------------------------------------

        print(
            f"UPDATED: {ticker} ({exchange}) | "
            f"Prices={len(prices)} | "
            f"MA20={ma20} | "
            f"MA50={ma50} | "
            f"Momentum={momentum} | "
            f"Volatility={volatility} | "
            f"Trend={trend} | "
            f"Score={score} | "
            f"Signal={signal}"
        )

        return "updated"


# ============================================================================
# MAIN
# ============================================================================

def main():

    connection = get_connection()

    try:

        # --------------------------------------------------------------------
        # Load companies
        #
        # We use the real companies table because it contains company_id.
        # --------------------------------------------------------------------

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    id,
                    ticker,
                    exchange
                FROM companies
                WHERE ticker IS NOT NULL
                  AND exchange IS NOT NULL
                ORDER BY id;
                """
            )

            companies = cursor.fetchall()

        total_companies = len(companies)

        print()
        print("=" * 60)
        print("INTELLIGENCE CALCULATION")
        print("=" * 60)

        print(
            f"Companies found:       {total_companies}"
        )

        print("=" * 60)
        print()

        updated = 0
        skipped = 0
        failed = 0

        # --------------------------------------------------------------------
        # Process every company
        # --------------------------------------------------------------------

        for index, (
            company_id,
            ticker,
            exchange,
        ) in enumerate(
            companies,
            start=1,
        ):

            print(
                f"[{index}/{total_companies}] "
                f"Processing {ticker} ({exchange})..."
            )

            try:

                result = process_company(
                    connection,
                    company_id,
                    ticker,
                    exchange,
                )

                # ------------------------------------------------------------
                # Successful update
                # ------------------------------------------------------------

                if result == "updated":

                    connection.commit()

                    updated += 1

                # ------------------------------------------------------------
                # No market prices / no dashboard row
                # ------------------------------------------------------------

                elif result == "skipped":

                    connection.rollback()

                    skipped += 1

            except Exception as error:

                # ------------------------------------------------------------
                # CRITICAL:
                #
                # PostgreSQL marks the transaction as aborted after an error.
                # Rollback clears that state so the next company can continue.
                # ------------------------------------------------------------

                connection.rollback()

                failed += 1

                print(
                    f"ERROR: {ticker} ({exchange}) - "
                    f"{error}"
                )

        # --------------------------------------------------------------------
        # Final summary
        # --------------------------------------------------------------------

        print()
        print("=" * 60)
        print("INTELLIGENCE CALCULATION COMPLETE")
        print("=" * 60)

        print(
            f"Companies found:       {total_companies}"
        )

        print(
            f"Companies updated:     {updated}"
        )

        print(
            f"Companies skipped:     {skipped}"
        )

        print(
            f"Companies failed:      {failed}"
        )

        print("=" * 60)

    finally:

        connection.close()


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()