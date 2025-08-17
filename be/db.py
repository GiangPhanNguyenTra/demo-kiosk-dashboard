# db.py
import pymysql
from contextlib import contextmanager

def get_connection():
    try:
        connection = pymysql.connect(
            host="localhost",
            user="root",
            password="",  # XAMPP mặc định không có password
            database="ai_kiosk",
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        raise Exception(f"Không thể kết nối database: {str(e)}")

@contextmanager
def get_cursor():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
