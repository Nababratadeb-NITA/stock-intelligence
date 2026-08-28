def resolve_company_id(
    conn,
    exchange,
    identifier_type,
    identifier_value
):
    with conn.cursor() as cur:

        cur.execute("""
            SELECT company_id
            FROM company_identifiers
            WHERE exchange = %s
              AND identifier_type = %s
              AND identifier_value = %s
            LIMIT 1;
        """, (
            exchange,
            identifier_type,
            identifier_value
        ))

        result = cur.fetchone()

        if result is None:
            raise ValueError(
                f"Company not found: "
                f"{exchange} / "
                f"{identifier_type} / "
                f"{identifier_value}"
            )

        return result[0]