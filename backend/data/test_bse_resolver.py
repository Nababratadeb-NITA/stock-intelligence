from .market_ingest import get_connection
from .company_resolver import resolve_company_id


with get_connection() as conn:

    tests = [
        ("NSE", "SYMBOL", "RELIANCE"),
        ("BSE", "SC_CODE", "500325"),
        ("NSE", "SYMBOL", "TCS"),
        ("BSE", "SC_CODE", "532540"),
        ("NSE", "SYMBOL", "HDFCBANK"),
        ("BSE", "SC_CODE", "500180"),
    ]

    for exchange, identifier_type, identifier_value in tests:

        company_id = resolve_company_id(
            conn,
            exchange,
            identifier_type,
            identifier_value
        )

        print(
            f"{exchange} {identifier_value}"
            f" → company_id {company_id}"
        )