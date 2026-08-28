from fastapi import APIRouter, HTTPException, Query
import psycopg

from .database import get_connection


router = APIRouter(
    prefix="/watchlist",
    tags=["Watchlist"],
)


# ---------------------------------------------------------------------------
# GET WATCHLIST
# ---------------------------------------------------------------------------

@router.get("/{user_id}")
def get_watchlist(user_id: int):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    w.id,
                    w.user_id,
                    c.id AS company_id,
                    c.ticker,
                    c.company_name,
                    c.exchange,
                    w.added_at
                FROM watchlist_items w
                JOIN companies c
                    ON c.id = w.company_id
                WHERE w.user_id = %s
                ORDER BY w.added_at DESC;
                """,
                (user_id,),
            )

            rows = cursor.fetchall()

            return [
                {
                    "id": row[0],
                    "user_id": row[1],
                    "company_id": row[2],
                    "ticker": row[3],
                    "company_name": row[4],
                    "exchange": row[5],
                    "added_at": (
                        row[6].isoformat()
                        if row[6] is not None
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
# ADD TO WATCHLIST
# ---------------------------------------------------------------------------

@router.post("/{user_id}/{company_id}")
def add_to_watchlist(
    user_id: int,
    company_id: int,
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:

            # Verify user exists
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
                    detail="User not found",
                )

            # Verify company exists
            cursor.execute(
                """
                SELECT
                    id,
                    ticker,
                    company_name,
                    exchange
                FROM companies
                WHERE id = %s;
                """,
                (company_id,),
            )

            company = cursor.fetchone()

            if company is None:
                raise HTTPException(
                    status_code=404,
                    detail="Company not found",
                )

            # Check whether already present
            cursor.execute(
                """
                SELECT
                    id,
                    added_at
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
                    "watchlist_item_id": existing[0],
                    "added_at": (
                        existing[1].isoformat()
                        if existing[1] is not None
                        else None
                    ),
                    "company": {
                        "id": company[0],
                        "ticker": company[1],
                        "company_name": company[2],
                        "exchange": company[3],
                    },
                }

            # Add stock
            cursor.execute(
                """
                INSERT INTO watchlist_items (
                    user_id,
                    company_id
                )
                VALUES (%s, %s)
                RETURNING
                    id,
                    added_at;
                """,
                (
                    user_id,
                    company_id,
                ),
            )

            row = cursor.fetchone()

            connection.commit()

            return {
                "status": "added",
                "message": "Stock added to watchlist.",
                "watchlist_item_id": row[0],
                "added_at": (
                    row[1].isoformat()
                    if row[1] is not None
                    else None
                ),
                "company": {
                    "id": company[0],
                    "ticker": company[1],
                    "company_name": company[2],
                    "exchange": company[3],
                },
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
# REMOVE FROM WATCHLIST
# ---------------------------------------------------------------------------

@router.delete("/{user_id}/{company_id}")
def remove_from_watchlist(
    user_id: int,
    company_id: int,
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
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

            row = cursor.fetchone()

            if row is None:
                connection.rollback()

                raise HTTPException(
                    status_code=404,
                    detail="Stock is not in the watchlist.",
                )

            connection.commit()

            return {
                "status": "removed",
                "message": "Stock removed from watchlist.",
                "watchlist_item_id": row[0],
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
# CHECK WATCHLIST STATUS
# ---------------------------------------------------------------------------

@router.get("/{user_id}/check/{company_id}")
def check_watchlist(
    user_id: int,
    company_id: int,
):
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    added_at
                FROM watchlist_items
                WHERE user_id = %s
                  AND company_id = %s;
                """,
                (
                    user_id,
                    company_id,
                ),
            )

            row = cursor.fetchone()

            if row is None:
                return {
                    "in_watchlist": False,
                    "watchlist_item_id": None,
                    "added_at": None,
                }

            return {
                "in_watchlist": True,
                "watchlist_item_id": row[0],
                "added_at": (
                    row[1].isoformat()
                    if row[1] is not None
                    else None
                ),
            }

    except psycopg.Error:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )

    finally:
        if connection is not None:
            connection.close()