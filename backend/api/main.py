from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import psycopg

from .database import get_connection
from .watchlist import router as watchlist_router


app = FastAPI(
    title="Stock Intelligence API",
    description=(
        "API for market data, technical indicators, "
        "stock intelligence, and watchlists."
    ),
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Shared configuration
# ---------------------------------------------------------------------------

STOCK_COLUMNS = [
    "intelligence_rank",
    "ticker",
    "company_name",
    "exchange",
    "latest_timestamp",
    "latest_close",
    "ma20",
    "ma50",
    "momentum_10d",
    "volatility_20d",
    "trend_signal",
    "intelligence_score",
    "intelligence_signal",
    "confidence_level",
]


def row_to_dict(row):
    return dict(zip(STOCK_COLUMNS, row))


def rows_to_dicts(rows):
    return [
        row_to_dict(row)
        for row in rows
    ]


def get_stock_query():
    return """
        SELECT
            intelligence_rank,
            ticker,
            company_name,
            exchange,
            latest_timestamp,
            latest_close,
            ma20,
            ma50,
            momentum_10d,
            volatility_20d,
            trend_signal,
            intelligence_score,
            intelligence_signal,
            confidence_level
        FROM investor_stock_dashboard
    """


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "name": "Stock Intelligence API",
        "version": "1.0.0",
        "status": "running",
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()

        return {
            "status": "ok",
            "database": "connected",
        }

    except psycopg.Error:
        return {
            "status": "ok",
            "database": "disconnected",
        }

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Historical stock prices
# ---------------------------------------------------------------------------

@app.get("/stocks/{ticker}/history")
def get_stock_history(
    ticker: str,
    exchange: str | None = Query(
        default=None,
        description="Exchange such as NSE or BSE",
    ),
):
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty",
        )

    normalized_exchange = (
        exchange.strip().upper()
        if exchange
        else None
    )

    if normalized_exchange is not None:
        if normalized_exchange not in {"NSE", "BSE"}:
            raise HTTPException(
                status_code=400,
                detail="Exchange must be NSE or BSE",
            )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            if normalized_exchange:

                cursor.execute(
                    """
                    SELECT
                        mp.timestamp,
                        mp.open,
                        mp.high,
                        mp.low,
                        mp.close,
                        mp.volume
                    FROM market_prices mp
                    JOIN companies c
                        ON c.id = mp.company_id
                    WHERE UPPER(c.ticker) = %s
                      AND UPPER(c.exchange) = %s
                    ORDER BY mp.timestamp ASC;
                    """,
                    (
                        normalized_ticker,
                        normalized_exchange,
                    ),
                )

            else:

                cursor.execute(
                    """
                    SELECT
                        mp.timestamp,
                        mp.open,
                        mp.high,
                        mp.low,
                        mp.close,
                        mp.volume
                    FROM market_prices mp
                    JOIN companies c
                        ON c.id = mp.company_id
                    WHERE UPPER(c.ticker) = %s
                    ORDER BY mp.timestamp ASC;
                    """,
                    (normalized_ticker,),
                )

            rows = cursor.fetchall()

            return [
                {
                    "timestamp": (
                        row[0].isoformat()
                        if row[0] is not None
                        else None
                    ),
                    "open": (
                        float(row[1])
                        if row[1] is not None
                        else None
                    ),
                    "high": (
                        float(row[2])
                        if row[2] is not None
                        else None
                    ),
                    "low": (
                        float(row[3])
                        if row[3] is not None
                        else None
                    ),
                    "close": (
                        float(row[4])
                        if row[4] is not None
                        else None
                    ),
                    "volume": (
                        int(row[5])
                        if row[5] is not None
                        else None
                    ),
                }
                for row in rows
            ]

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# All stocks
# ---------------------------------------------------------------------------

@app.get("/stocks")
def get_stocks():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                get_stock_query()
                + """
                ORDER BY intelligence_rank;
                """
            )

            rows = cursor.fetchall()

            return rows_to_dicts(rows)

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Top stocks
# ---------------------------------------------------------------------------

@app.get("/stocks/top")
def get_top_stocks(
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    )
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                get_stock_query()
                + """
                ORDER BY
                    intelligence_score DESC,
                    intelligence_rank ASC
                LIMIT %s;
                """,
                (limit,),
            )

            rows = cursor.fetchall()

            return rows_to_dicts(rows)

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Filter stocks by intelligence signal
# ---------------------------------------------------------------------------

@app.get("/stocks/filter")
def filter_stocks(signal: str):
    allowed_signals = {
        "BUY_CANDIDATE",
        "WATCH",
        "WEAK",
    }

    normalized_signal = signal.strip().upper()

    if normalized_signal not in allowed_signals:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid signal. Use BUY_CANDIDATE, "
                "WATCH, or WEAK."
            ),
        )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                get_stock_query()
                + """
                WHERE intelligence_signal = %s
                ORDER BY
                    intelligence_score DESC,
                    intelligence_rank ASC;
                """,
                (normalized_signal,),
            )

            rows = cursor.fetchall()

            return rows_to_dicts(rows)

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.get("/dashboard")
def get_dashboard():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    intelligence_rank,
                    ticker,
                    company_name,
                    exchange,
                    latest_timestamp,
                    latest_close,
                    ma20,
                    ma50,
                    momentum_10d,
                    volatility_20d,
                    trend_signal,
                    intelligence_score,
                    intelligence_signal,
                    confidence_level
                FROM investor_stock_dashboard
                ORDER BY intelligence_rank;
                """
            )

            rows = cursor.fetchall()

            stocks = rows_to_dicts(rows)

            return {
                "status": "ok",
                "total_stocks": len(stocks),
                "stocks": stocks,
            }

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Single stock
# ---------------------------------------------------------------------------

@app.get("/stocks/{ticker}")
def get_stock(
    ticker: str,
    exchange: str | None = Query(
        default=None,
        description="Exchange such as NSE or BSE",
    ),
):
    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty",
        )

    normalized_exchange = (
        exchange.strip().upper()
        if exchange
        else None
    )

    if normalized_exchange is not None:
        if normalized_exchange not in {"NSE", "BSE"}:
            raise HTTPException(
                status_code=400,
                detail="Exchange must be NSE or BSE",
            )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            if normalized_exchange:

                cursor.execute(
                    get_stock_query()
                    + """
                    WHERE UPPER(ticker) = %s
                      AND UPPER(exchange) = %s
                    LIMIT 1;
                    """,
                    (
                        normalized_ticker,
                        normalized_exchange,
                    ),
                )

            else:

                cursor.execute(
                    get_stock_query()
                    + """
                    WHERE UPPER(ticker) = %s
                    LIMIT 1;
                    """,
                    (normalized_ticker,),
                )

            row = cursor.fetchone()

            if row is None:

                if normalized_exchange:
                    detail = (
                        f"Stock '{normalized_ticker}' "
                        f"on {normalized_exchange} not found"
                    )
                else:
                    detail = (
                        f"Stock '{normalized_ticker}' "
                        f"not found"
                    )

                raise HTTPException(
                    status_code=404,
                    detail=detail,
                )

            return row_to_dict(row)

    except HTTPException:
        raise

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

@app.get("/search")
def search_stocks(q: str):
    search_query = q.strip()

    if not search_query:
        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty",
        )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            search_term = f"%{search_query}%"

            cursor.execute(
                """
                SELECT
                    intelligence_rank,
                    ticker,
                    company_name,
                    exchange,
                    latest_close,
                    intelligence_score,
                    trend_signal,
                    intelligence_signal,
                    confidence_level
                FROM investor_stock_dashboard
                WHERE
                    ticker ILIKE %s
                    OR company_name ILIKE %s
                ORDER BY intelligence_rank
                LIMIT 20;
                """,
                (
                    search_term,
                    search_term,
                ),
            )

            rows = cursor.fetchall()

            columns = [
                "intelligence_rank",
                "ticker",
                "company_name",
                "exchange",
                "latest_close",
                "intelligence_score",
                "trend_signal",
                "intelligence_signal",
                "confidence_level",
            ]

            return [
                dict(zip(columns, row))
                for row in rows
            ]

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Dashboard statistics
# ---------------------------------------------------------------------------

@app.get("/stats")
def get_statistics():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*) AS total_stocks,
                    COUNT(*) FILTER (
                        WHERE intelligence_signal = 'BUY_CANDIDATE'
                    ) AS buy_candidates,
                    COUNT(*) FILTER (
                        WHERE intelligence_signal = 'WATCH'
                    ) AS watch_stocks,
                    COUNT(*) FILTER (
                        WHERE intelligence_signal = 'WEAK'
                    ) AS weak_stocks,
                    COUNT(*) FILTER (
                        WHERE trend_signal = 'BULLISH'
                    ) AS bullish_stocks,
                    COUNT(*) FILTER (
                        WHERE trend_signal = 'NEUTRAL'
                    ) AS neutral_stocks,
                    COUNT(*) FILTER (
                        WHERE trend_signal = 'BEARISH'
                    ) AS bearish_stocks,
                    COUNT(*) FILTER (
                        WHERE confidence_level = 'HIGH'
                    ) AS high_confidence
                FROM investor_stock_dashboard;
                """
            )

            row = cursor.fetchone()

            columns = [
                "total_stocks",
                "buy_candidates",
                "watch_stocks",
                "weak_stocks",
                "bullish_stocks",
                "neutral_stocks",
                "bearish_stocks",
                "high_confidence",
            ]

            return dict(zip(columns, row))

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Signal distribution
# ---------------------------------------------------------------------------

@app.get("/signals")
def get_signal_distribution():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    intelligence_signal,
                    COUNT(*) AS stock_count
                FROM investor_stock_dashboard
                GROUP BY intelligence_signal
                ORDER BY stock_count DESC;
                """
            )

            rows = cursor.fetchall()

            return [
                {
                    "intelligence_signal": row[0],
                    "stock_count": row[1],
                }
                for row in rows
            ]

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ===========================================================================
# WATCHLIST
# ===========================================================================


# ---------------------------------------------------------------------------
# Get user's watchlist
# ---------------------------------------------------------------------------

@app.get("/watchlist")
def get_watchlist(
    user_id: int = Query(
        ...,
        ge=1,
        description="User ID",
    )
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.id AS company_id,
                    c.ticker,
                    c.company_name,
                    c.exchange,
                    wi.added_at,
                    d.latest_close,
                    d.intelligence_score,
                    d.intelligence_signal,
                    d.trend_signal,
                    d.confidence_level,
                    d.intelligence_rank
                FROM watchlist_items wi
                JOIN companies c
                    ON c.id = wi.company_id
                LEFT JOIN investor_stock_dashboard d
                    ON UPPER(d.ticker) = UPPER(c.ticker)
                   AND UPPER(d.exchange) = UPPER(c.exchange)
                WHERE wi.user_id = %s
                ORDER BY wi.added_at DESC;
                """,
                (user_id,),
            )

            rows = cursor.fetchall()

            return [
                {
                    "company_id": row[0],
                    "ticker": row[1],
                    "company_name": row[2],
                    "exchange": row[3],
                    "added_at": (
                        row[4].isoformat()
                        if row[4] is not None
                        else None
                    ),
                    "latest_close": (
                        float(row[5])
                        if row[5] is not None
                        else None
                    ),
                    "intelligence_score": (
                        float(row[6])
                        if row[6] is not None
                        else None
                    ),
                    "intelligence_signal": row[7],
                    "trend_signal": row[8],
                    "confidence_level": row[9],
                    "intelligence_rank": row[10],
                }
                for row in rows
            ]

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Add stock to watchlist
# ---------------------------------------------------------------------------

@app.post("/watchlist/{ticker}")
def add_to_watchlist(
    ticker: str,
    user_id: int = Query(
        ...,
        ge=1,
        description="User ID",
    ),
    exchange: str = Query(
        ...,
        description="Exchange such as NSE or BSE",
    ),
):
    normalized_ticker = ticker.strip().upper()
    normalized_exchange = exchange.strip().upper()

    if not normalized_ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty",
        )

    if normalized_exchange not in {"NSE", "BSE"}:
        raise HTTPException(
            status_code=400,
            detail="Exchange must be NSE or BSE",
        )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            # --------------------------------------------------------------
            # Verify user exists
            # --------------------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM users
                WHERE id = %s;
                """,
                (user_id,),
            )

            user = cursor.fetchone()

            if user is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"User {user_id} not found",
                )

            # --------------------------------------------------------------
            # Find company
            # --------------------------------------------------------------

            cursor.execute(
                """
                SELECT
                    id,
                    ticker,
                    company_name,
                    exchange
                FROM companies
                WHERE UPPER(ticker) = %s
                  AND UPPER(exchange) = %s
                LIMIT 1;
                """,
                (
                    normalized_ticker,
                    normalized_exchange,
                ),
            )

            company = cursor.fetchone()

            if company is None:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Stock '{normalized_ticker}' "
                        f"on {normalized_exchange} not found"
                    ),
                )

            company_id = company[0]

            # --------------------------------------------------------------
            # Check existing watchlist item
            # --------------------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM watchlist_items
                WHERE user_id = %s
                  AND company_id = %s;
                """,
                (
                    user_id,
                    company_id,
                ),
            )

            existing = cursor.fetchone()

            if existing is not None:
                return {
                    "status": "already_exists",
                    "message": "Stock is already in the watchlist.",
                    "watchlist_id": existing[0],
                    "user_id": user_id,
                    "company_id": company_id,
                    "ticker": company[1],
                    "company_name": company[2],
                    "exchange": company[3],
                }

            # --------------------------------------------------------------
            # Add to watchlist
            # --------------------------------------------------------------

            cursor.execute(
                """
                INSERT INTO watchlist_items (
                    user_id,
                    company_id
                )
                VALUES (
                    %s,
                    %s
                )
                RETURNING
                    id,
                    added_at;
                """,
                (
                    user_id,
                    company_id,
                ),
            )

            inserted = cursor.fetchone()

        connection.commit()

        return {
            "status": "added",
            "message": "Stock added to watchlist.",
            "watchlist_id": inserted[0],
            "user_id": user_id,
            "company_id": company_id,
            "ticker": company[1],
            "company_name": company[2],
            "exchange": company[3],
            "added_at": (
                inserted[1].isoformat()
                if inserted[1] is not None
                else None
            ),
        }

    except HTTPException:
        if connection is not None:
            connection.rollback()
        raise

    except psycopg.Error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Remove stock from watchlist
# ---------------------------------------------------------------------------

@app.delete("/watchlist/{ticker}")
def remove_from_watchlist(
    ticker: str,
    user_id: int = Query(
        ...,
        ge=1,
        description="User ID",
    ),
    exchange: str = Query(
        ...,
        description="Exchange such as NSE or BSE",
    ),
):
    normalized_ticker = ticker.strip().upper()
    normalized_exchange = exchange.strip().upper()

    if not normalized_ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty",
        )

    if normalized_exchange not in {"NSE", "BSE"}:
        raise HTTPException(
            status_code=400,
            detail="Exchange must be NSE or BSE",
        )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            # --------------------------------------------------------------
            # Find company
            # --------------------------------------------------------------

            cursor.execute(
                """
                SELECT id
                FROM companies
                WHERE UPPER(ticker) = %s
                  AND UPPER(exchange) = %s
                LIMIT 1;
                """,
                (
                    normalized_ticker,
                    normalized_exchange,
                ),
            )

            company = cursor.fetchone()

            if company is None:
                raise HTTPException(
                    status_code=404,
                    detail=(
                        f"Stock '{normalized_ticker}' "
                        f"on {normalized_exchange} not found"
                    ),
                )

            company_id = company[0]

            # --------------------------------------------------------------
            # Delete watchlist item
            # --------------------------------------------------------------

            cursor.execute(
                """
                DELETE FROM watchlist_items
                WHERE user_id = %s
                  AND company_id = %s
                RETURNING id;
                """,
                (
                    user_id,
                    company_id,
                ),
            )

            deleted = cursor.fetchone()

            if deleted is None:
                connection.rollback()

                raise HTTPException(
                    status_code=404,
                    detail="Stock is not in the watchlist.",
                )

        connection.commit()

        return {
            "status": "removed",
            "message": "Stock removed from watchlist.",
            "watchlist_id": deleted[0],
            "user_id": user_id,
            "company_id": company_id,
            "ticker": normalized_ticker,
            "exchange": normalized_exchange,
        }

    except HTTPException:
        raise

    except psycopg.Error:
        if connection is not None:
            connection.rollback()

        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()


# ---------------------------------------------------------------------------
# Check whether stock is in user's watchlist
# ---------------------------------------------------------------------------

@app.get("/watchlist/check/{ticker}")
def check_watchlist(
    ticker: str,
    user_id: int = Query(
        ...,
        ge=1,
        description="User ID",
    ),
    exchange: str = Query(
        ...,
        description="Exchange such as NSE or BSE",
    ),
):
    normalized_ticker = ticker.strip().upper()
    normalized_exchange = exchange.strip().upper()

    if not normalized_ticker:
        raise HTTPException(
            status_code=400,
            detail="Ticker cannot be empty",
        )

    if normalized_exchange not in {"NSE", "BSE"}:
        raise HTTPException(
            status_code=400,
            detail="Exchange must be NSE or BSE",
        )

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            cursor.execute(
                """
                SELECT
                    wi.id,
                    c.id,
                    c.ticker,
                    c.company_name,
                    c.exchange
                FROM watchlist_items wi
                JOIN companies c
                    ON c.id = wi.company_id
                WHERE wi.user_id = %s
                  AND UPPER(c.ticker) = %s
                  AND UPPER(c.exchange) = %s
                LIMIT 1;
                """,
                (
                    user_id,
                    normalized_ticker,
                    normalized_exchange,
                ),
            )

            row = cursor.fetchone()

            if row is None:
                return {
                    "in_watchlist": False,
                    "user_id": user_id,
                    "ticker": normalized_ticker,
                    "exchange": normalized_exchange,
                }

            return {
                "in_watchlist": True,
                "watchlist_id": row[0],
                "company_id": row[1],
                "ticker": row[2],
                "company_name": row[3],
                "exchange": row[4],
                "user_id": user_id,
            }

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()