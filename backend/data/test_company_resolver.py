from .market_ingest import get_connection
from .company_resolver import resolve_company_id


with get_connection() as conn:

    company_id = resolve_company_id(
        conn,
        "NSE",
        "SYMBOL",
        "RELIANCE"
    )

    print("Resolved company_id:", company_id)