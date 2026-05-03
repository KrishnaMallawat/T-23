import mysql.connector
import mysql.connector.errors
from config import DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

from mysql.connector import pooling

# Create a global connection pool
try:
    db_pool = pooling.MySQLConnectionPool(
        pool_name="slotsy_pool",
        pool_size=10,
        pool_reset_session=True,
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        autocommit=False
    )
except Exception as e:
    print(f"Failed to initialize database pool: {e}")
    db_pool = None

def get_connection():
    """Return a connection from the pool."""
    if not db_pool:
        raise Exception("Database pool is not initialized.")
    return db_pool.get_connection()

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
        cursor = conn.cursor(dictionary=True, buffered=True)
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
