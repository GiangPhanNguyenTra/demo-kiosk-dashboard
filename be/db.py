import os
import pymysql
from contextlib import contextmanager

def get_connection():
    try:
        connection = pymysql.connect(
            host=os.getenv("MYSQLHOST", "localhost"),
            user=os.getenv("MYSQLUSER", "root"),
            password=os.getenv("MYSQLPASSWORD", ""),
            database=os.getenv("MYSQLDATABASE", "ai_kiosk"),
            port=int(os.getenv("MYSQLPORT", 3306)),
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5
        )
        return connection
    except Exception as e:
        print(f"Database connection error: {e}")
        raise Exception(f"Không thể kết nối database: {str(e)}")
