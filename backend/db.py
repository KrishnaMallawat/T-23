import mysql.connector
import mysql.connector.errors
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD


def get_connection():
    """Return a new MySQL connection."""
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        autocommit=False,
    )


def execute(query, params=None, fetch="none"):
    """
    Convenience wrapper for one-shot queries.

    fetch:
      "one"       → return a single row dict (or None)
      "all"       → return list of row dicts
      "lastrowid" → commit and return the last inserted row ID
      "none"      → commit and return None
    """
    conn = get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())

        if fetch == "one":
            result = cursor.fetchone()
        elif fetch == "all":
            result = cursor.fetchall()
        elif fetch == "lastrowid":
            conn.commit()
            return cursor.lastrowid
        else:
            conn.commit()
            return None

        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
