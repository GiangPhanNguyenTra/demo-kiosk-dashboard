# ====== 1. Import và cấu hình app, bảo mật ======
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional
import jwt
import hashlib
import datetime
import pandas as pd
import io
import zipfile
from db import get_connection

import tempfile
import os
import xlsxwriter

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("No SECRET_KEY set for JWT")

ALGORITHM = "HS256"
origins = [
    "https://ai-kiosk-dashboard.vercel.app",
    "https://ai-kiosk-dashboard-demo.vercel.app",
    "https://ai-kiosk-fe.onrender.com"
]

app = FastAPI(
    title="AI-Kiosk Backend",
    description="Backend API phân quyền nhiều cấp: admin, city, ward.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # hoặc ["*"] nếu bạn chấp nhận toàn bộ
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ====== 2. Định nghĩa bảo mật JWT với OAuth2 ======
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# ====== 3. API Đăng nhập (login, trả về access token) ======
@app.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    username = form_data.username
    password = form_data.password

    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
        user = cursor.fetchone()
    conn.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    if password_hash != user['password_hash']:
        raise HTTPException(status_code=401, detail="Wrong password")

    payload = {
        "user_id": user["user_id"],
        "username": user["username"],
        "role": user["role"],
        "ward_id": user["ward_id"],
        "city_id": user["city_id"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer"}

# ====== 4. Middleware: Lấy thông tin user từ token (và kiểm tra hạn token) ======
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if not all(key in payload for key in ["user_id", "username", "role"]):
            raise HTTPException(status_code=401, detail="Invalid token format")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token error: {str(e)}")

# ====== 5. API Xem danh sách user (READ, phân quyền cấp bậc) ======
@app.get("/users", summary="Danh sách user theo phân quyền")
async def get_users(user: dict = Depends(get_current_user)):
    try:
        conn = get_connection()
        with conn.cursor() as cursor:
            if user["role"] == "admin":
                # Admin lấy toàn bộ user hệ thống
                cursor.execute("SELECT * FROM users ORDER BY user_id")
            elif user["role"] == "city":
                cursor.execute("""
                    SELECT * FROM users 
                    WHERE city_id = %s AND (role = 'ward' OR user_id = %s)
                    ORDER BY user_id
                """, (user["city_id"], user["user_id"]))
            elif user["role"] == "ward":
                cursor.execute("SELECT * FROM users WHERE user_id = %s", (user["user_id"],))
            else:
                raise HTTPException(status_code=403, detail="Invalid role")
            
            users = cursor.fetchall()
            return {"users": users, "success": True}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

# ====== 6. API Tạo user mới (CREATE - chỉ dành cho admin) ======
class UserCreate(BaseModel):
    username: str
    password: str
    role: str  # "ward" hoặc "city"
    ward_id: int = None
    city_id: int = None

@app.post("/users", summary="Admin tạo user mới")
async def create_user(
    user_data: UserCreate,
    user: dict = Depends(get_current_user)
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create user")

    # Kiểm tra dữ liệu đầu vào hợp lệ cho từng role
    if user_data.role == "admin":
        # Admin không cần city_id, ward_id
        user_data.city_id = None
        user_data.ward_id = None
    elif user_data.role == "city":
        if not user_data.city_id:
            raise HTTPException(status_code=400, detail="City user phải có city_id")
        user_data.ward_id = None
    elif user_data.role == "ward":
        if not user_data.city_id or not user_data.ward_id:
            raise HTTPException(status_code=400, detail="Ward user phải có city_id và ward_id")
    else:
        raise HTTPException(status_code=400, detail="Role không hợp lệ")

    password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
    conn = get_connection()
    with conn.cursor() as cursor:
        try:
            # Sửa lỗi: Thêm user_id là AUTO_INCREMENT, không truyền vào INSERT
            cursor.execute(
                "INSERT INTO users (username, password_hash, role, ward_id, city_id) VALUES (%s, %s, %s, %s, %s)",
                (user_data.username, password_hash, user_data.role, user_data.ward_id, user_data.city_id)
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise HTTPException(status_code=400, detail=f"Error: {e}")
    conn.close()
    return {"msg": "User created successfully"}

# ====== 7. API Xóa user (DELETE - chỉ dành cho admin) ======
@app.delete("/users/{user_id}", summary="Admin xóa user")
async def delete_user(
    user_id: int,
    user: dict = Depends(get_current_user)
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete user")
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("DELETE FROM users WHERE user_id=%s", (user_id,))
        conn.commit()
    conn.close()
    return {"msg": "User deleted successfully"}

# ====== 8. API Đổi mật khẩu (ai cũng được quyền đổi mật khẩu chính mình) ======
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@app.post("/users/change-password", summary="Đổi mật khẩu chính mình")
async def change_password(
    req: ChangePasswordRequest,
    user: dict = Depends(get_current_user)
):
    conn = get_connection()
    with conn.cursor() as cursor:
        cursor.execute("SELECT password_hash FROM users WHERE user_id=%s", (user["user_id"],))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        old_hash = hashlib.sha256(req.old_password.encode()).hexdigest()
        if old_hash != row["password_hash"]:
            raise HTTPException(status_code=401, detail="Wrong old password")

        new_hash = hashlib.sha256(req.new_password.encode()).hexdigest()
        cursor.execute("UPDATE users SET password_hash=%s WHERE user_id=%s", (new_hash, user["user_id"]))
        conn.commit()
    conn.close()
    return {"msg": "Password changed successfully"}

# ====== 9. API Xem báo cáo (READ ONLY, phân trang, phân quyền) ======
@app.get("/reports", summary="Xem báo cáo theo phân quyền, có phân trang")
async def get_reports(
    user: dict = Depends(get_current_user),
    limit: int = Query(1000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    all: bool = Query(False)
):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Chỉ lấy các cột cần thiết, không lặp cột
        base_columns = """
            r.id, r.ward_id, r.city_id, r.date, r.procedure, r.count, r.age_group, r.gender, r.domain, r.auth_type, r.print_time, w.ward_name
        """
        if user["role"] == "admin":
            sql = f"""
                SELECT {base_columns}
                FROM reports r
                LEFT JOIN wards w ON r.ward_id = w.ward_id 
                WHERE r.print_time BETWEEN 7 AND 17
                ORDER BY r.date DESC, r.print_time ASC
                LIMIT %s OFFSET %s
            """
            params = (limit, offset)
        elif user["role"] == "city":
            sql = f"""
                SELECT {base_columns}
                FROM reports r
                LEFT JOIN wards w ON r.ward_id = w.ward_id 
                WHERE r.city_id = %s 
                AND r.print_time BETWEEN 7 AND 17
                ORDER BY r.date DESC, r.print_time ASC
                LIMIT %s OFFSET %s
            """
            params = (user['city_id'], limit, offset)
        else:
            sql = f"""
                SELECT {base_columns}
                FROM reports r
                LEFT JOIN wards w ON r.ward_id = w.ward_id 
                WHERE r.ward_id = %s 
                AND r.print_time BETWEEN 7 AND 17
                ORDER BY r.date DESC, r.print_time ASC
                LIMIT %s OFFSET %s
            """
            params = (user['ward_id'], limit, offset)
        cursor.execute(sql, params)
        data = cursor.fetchall()
        processed_data = []
        for row in data:
            if row:
                processed_row = dict(row)
                processed_row['hour'] = int(processed_row.get('print_time', 0))
                if processed_row.get('date'):
                    processed_row['date'] = processed_row['date'].strftime('%Y-%m-%d') if hasattr(processed_row['date'], 'strftime') else processed_row['date']
                if 'gender' not in processed_row:
                    processed_row['gender'] = None
                processed_data.append(processed_row)
        final_response = {
            "success": True,
            "data": processed_data,
            "total": len(processed_data)
        }
        print("Reports API response:", final_response)
        return final_response
    except Exception as e:
        print(f"Database error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"success": False, "message": "Lỗi khi truy vấn dữ liệu"}
        )

# ====== 10. API Xuất báo cáo (Excel/CSV) theo phân quyền ======
@app.get("/reports/export", summary="Xuất báo cáo (Excel/CSV) theo phân quyền")
async def export_reports(
    user: dict = Depends(get_current_user),
    limit: int = Query(10000, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    group_by: str = Query("Ngày"),
    start_date: str = Query(None),
    end_date: str = Query(None),
    ward_id: int = Query(None),
    format: str = Query("xlsx")
):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        base_columns = """
            r.id, r.ward_id, r.city_id, r.date, r.procedure, r.count, r.age_group, r.gender, r.domain, r.auth_type, r.print_time, w.ward_name
        """
        
        print(f"Export request - User role: {user['role']}, ward_id param: {ward_id}, user ward_id: {user.get('ward_id')}, user city_id: {user.get('city_id')}")
        
        # Xử lý logic phân quyền
        if user["role"] == "admin":
            if ward_id is not None:
                # Admin muốn export báo cáo của ward cụ thể
                sql = f"""
                    SELECT {base_columns}
                    FROM reports r
                    LEFT JOIN wards w ON r.ward_id = w.ward_id 
                    WHERE r.ward_id = %s AND r.print_time BETWEEN 7 AND 17
                """
                params = [ward_id]
                print(f"Admin exporting for ward_id: {ward_id}")
            else:
                # Admin export toàn bộ
                sql = f"""
                    SELECT {base_columns}
                    FROM reports r
                    LEFT JOIN wards w ON r.ward_id = w.ward_id 
                    WHERE r.print_time BETWEEN 7 AND 17
                """
                params = []
                print("Admin exporting all data")
                
        elif user["role"] == "city":
            if ward_id is not None and ward_id > 0:
                # City user muốn export báo cáo của ward cụ thể trong city của mình
                # Kiểm tra ward có thuộc city không
                cursor.execute("SELECT city_id FROM wards WHERE ward_id = %s", (ward_id,))
                ward_info = cursor.fetchone()
                
                if not ward_info:
                    raise HTTPException(status_code=404, detail=f"Ward {ward_id} không tồn tại")
                
                if ward_info['city_id'] != user['city_id']:
                    raise HTTPException(status_code=403, detail=f"Ward {ward_id} không thuộc city {user['city_id']} của bạn")
                
                sql = f"""
                    SELECT {base_columns}
                    FROM reports r
                    LEFT JOIN wards w ON r.ward_id = w.ward_id 
                    WHERE r.ward_id = %s AND r.city_id = %s AND r.print_time BETWEEN 7 AND 17
                """
                params = [ward_id, user['city_id']]
                print(f"✅ City user exporting for ward_id: {ward_id} in city: {user['city_id']}")
            else:
                # City user export toàn bộ city
                sql = f"""
                    SELECT {base_columns}
                    FROM reports r
                    LEFT JOIN wards w ON r.ward_id = w.ward_id 
                    WHERE r.city_id = %s AND r.print_time BETWEEN 7 AND 17
                """
                params = [user['city_id']]
                print(f"✅ City user exporting all data for city: {user['city_id']}")
                
        else:  # ward role
            # Ward user chỉ được export dữ liệu của ward mình
            sql = f"""
                SELECT {base_columns}
                FROM reports r
                LEFT JOIN wards w ON r.ward_id = w.ward_id 
                WHERE r.ward_id = %s AND r.print_time BETWEEN 7 AND 17
            """
            params = [user['ward_id']]
            print(f"Ward user exporting for own ward: {user['ward_id']}")

        # Thêm lọc theo ngày nếu có
        if start_date and end_date:
            sql += " AND DATE(r.date) >= %s AND DATE(r.date) <= %s"
            params.extend([start_date, end_date])
            
        sql += " ORDER BY r.date DESC, r.print_time ASC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        print(f"Final SQL: {sql}")
        print(f"Final params: {params}")

        cursor.execute(sql, tuple(params))
        data = cursor.fetchall()
        print(f"Query returned {len(data)} rows")

        # Sửa lỗi 500: phải tạo processed_data từ data trước khi tạo DataFrame
        processed_data = []
        for row in data:
            if row:
                processed_row = dict(row)
                processed_row['hour'] = int(processed_row.get('print_time', 0)) if processed_row.get('print_time') is not None else None
                if processed_row.get('date'):
                    processed_row['date'] = processed_row['date'].strftime('%Y-%m-%d') if hasattr(processed_row['date'], 'strftime') else processed_row['date']
                if 'gender' not in processed_row:
                    processed_row['gender'] = None
                processed_data.append(processed_row)

        df_data = pd.DataFrame(processed_data)
        # --- Chuẩn bị các bảng dữ liệu cho từng sheet ---
        # Xử lý trùng cột: chỉ giữ lại các cột gốc, loại bỏ cột bắt đầu bằng "r."
        if not df_data.empty:
            # Loại bỏ các cột bắt đầu bằng "r."
            df_data = df_data.loc[:, ~df_data.columns.str.startswith('r.')]
            # Nếu có các cột trùng tên (ví dụ: 'domain' và '.domain'), chỉ giữ lại 'domain'
            for col in df_data.columns:
                if col.startswith('.'):
                    base_col = col[1:]
                    if base_col in df_data.columns:
                        df_data = df_data.drop(columns=[col])
                    else:
                        df_data = df_data.rename(columns={col: base_col})
        # Số lượt in theo ngày/tuần
        if not df_data.empty:
            if group_by == "Tuần":
                df_data['week'] = pd.to_datetime(df_data['date']).dt.strftime('%G-[W]%V')
                so_luot_in = df_data.groupby('week').size().reset_index(name='Số lượt in')
                so_luot_in['Từ'] = pd.to_datetime(so_luot_in['week'].str[:4] + '-W' + so_luot_in['week'].str[-2:] + '-1', errors='coerce').dt.strftime('%d/%m')
                so_luot_in['Đến'] = pd.to_datetime(so_luot_in['week'].str[:4] + '-W' + so_luot_in['week'].str[-2:] + '-7', errors='coerce').dt.strftime('%d/%m')
                so_luot_in = so_luot_in.rename(columns={'week': 'Tuần'})
                so_luot_in = so_luot_in[['Tuần', 'Từ', 'Đến', 'Số lượt in']]
            else:
                so_luot_in = df_data.groupby('date').size().reset_index(name='Số lượt in')
                so_luot_in = so_luot_in.rename(columns={'date': 'Ngày'})
        else:
            so_luot_in = pd.DataFrame()

        # Lĩnh vực
        if not df_data.empty and 'domain' in df_data.columns:
            linh_vuc = df_data.groupby('domain').size().reset_index(name='Tần suất')
            linh_vuc = linh_vuc.rename(columns={'domain': 'Lĩnh vực'})
        else:
            linh_vuc = pd.DataFrame()

        # Top thủ tục
        if not df_data.empty and 'procedure' in df_data.columns:
            top_thu_tuc = df_data.groupby('procedure').size().reset_index(name='Tần suất')
            top_thu_tuc = top_thu_tuc.rename(columns={'procedure': 'Tên thủ tục'})
            top_thu_tuc = top_thu_tuc.sort_values('Tần suất', ascending=False).head(8)
        else:
            top_thu_tuc = pd.DataFrame()

        # In theo giờ
        if not df_data.empty and 'hour' in df_data.columns:
            in_theo_gio = df_data.groupby('hour').agg(
                Trung_binh=('hour', 'count'),
                Tong_so_luot=('hour', 'size'),
                So_ngay_co_in=('date', pd.Series.nunique)
            ).reset_index().rename(columns={
                'hour': 'Giờ',
                'Trung_binh': 'Trung bình',
                'Tong_so_luot': 'Tổng số lượt',
                'So_ngay_co_in': 'Số ngày có in'
            })
        else:
            in_theo_gio = pd.DataFrame()

        # Tuổi & Giới tính
        if not df_data.empty and 'age_group' in df_data.columns and 'gender' in df_data.columns:
            tuoi_gioitinh = df_data.groupby(['age_group', 'gender']).size().unstack(fill_value=0)
            tuoi_gioitinh['Tổng'] = tuoi_gioitinh.sum(axis=1)
            tuoi_gioitinh = tuoi_gioitinh.reset_index().rename(columns={'age_group': 'Nhóm tuổi', 'male': 'Nam', 'female': 'Nữ', 'nam': 'Nam', 'nữ': 'Nữ', 'nu': 'Nữ'})
        else:
            tuoi_gioitinh = pd.DataFrame()

        # Xác thực
        if not df_data.empty and 'auth_type' in df_data.columns:
            xac_thuc = df_data.groupby('auth_type').size().reset_index(name='Số lượng')
            xac_thuc['Tỷ lệ (%)'] = (xac_thuc['Số lượng'] / xac_thuc['Số lượng'].sum() * 100).round(1)
            xac_thuc = xac_thuc.rename(columns={'auth_type': 'Loại xác thực'})
        else:
            xac_thuc = pd.DataFrame()

        # Debug: log số lượng dòng từng bảng
        print("Export: df_data rows:", len(df_data))
        print("Export: processed_data rows:", len(processed_data))

        # Đảm bảo các bảng không bị lỗi khi rỗng
        if df_data is None or not isinstance(df_data, pd.DataFrame):
            df_data = pd.DataFrame()
        if 'so_luot_in' not in locals() or so_luot_in is None:
            so_luot_in = pd.DataFrame()
        if 'linh_vuc' not in locals() or linh_vuc is None:
            linh_vuc = pd.DataFrame()
        if 'top_thu_tuc' not in locals() or top_thu_tuc is None:
            top_thu_tuc = pd.DataFrame()
        if 'in_theo_gio' not in locals() or in_theo_gio is None:
            in_theo_gio = pd.DataFrame()
        if 'tuoi_gioitinh' not in locals() or tuoi_gioitinh is None:
            tuoi_gioitinh = pd.DataFrame()
        if 'xac_thuc' not in locals() or xac_thuc is None:
            xac_thuc = pd.DataFrame()

        # Nếu không có dữ liệu, trả về file rỗng
        if df_data.empty:
            print("Export: Không có dữ liệu báo cáo, trả về file rỗng.")
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
                file_path = tmp.name
                with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
                    pd.DataFrame().to_excel(writer, sheet_name='Data', index=False)
            filename = "dashboard_inphieu.xlsx"
            return FileResponse(
                file_path,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                filename=filename,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )

        if format == "csv":
            # --- Ghi file ZIP chứa nhiều file CSV ---
            # Đảm bảo import tempfile ở đầu file, KHÔNG import lại trong block này
            import os
            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp_zip:
                with zipfile.ZipFile(tmp_zip.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    # Data sheet
                    df_data.to_csv("data.csv", index=False)
                    zipf.write("data.csv")
                    os.remove("data.csv")
                    # Số lượt in
                    so_luot_in.to_csv("so_luot_in.csv", index=False)
                    zipf.write("so_luot_in.csv")
                    os.remove("so_luot_in.csv")
                    # Lĩnh vực
                    linh_vuc.to_csv("linh_vuc.csv", index=False)
                    zipf.write("linh_vuc.csv")
                    os.remove("linh_vuc.csv")
                    # Top thủ tục
                    top_thu_tuc.to_csv("top_thu_tuc.csv", index=False)
                    zipf.write("top_thu_tuc.csv")
                    os.remove("top_thu_tuc.csv")
                    # In theo giờ
                    in_theo_gio.to_csv("in_theo_gio.csv", index=False)
                    zipf.write("in_theo_gio.csv")
                    os.remove("in_theo_gio.csv")
                    # Tuổi & Giới tính
                    if not tuoi_gioitinh.empty:
                        tuoi_gioitinh.to_csv("tuoi_gioitinh.csv", index=False)
                        zipf.write("tuoi_gioitinh.csv")
                        os.remove("tuoi_gioitinh.csv")
                    # Xác thực
                    if not xac_thuc.empty:
                        xac_thuc.to_csv("xac_thuc.csv", index=False)
                        zipf.write("xac_thuc.csv")
                        os.remove("xac_thuc.csv")
                filename = "dashboard_inphieu.zip"
                return FileResponse(
                    tmp_zip.name,
                    media_type="application/zip",
                    filename=filename,
                    headers={"Content-Disposition": f"attachment; filename={filename}"}
                )
        else:
            # --- Ghi file Excel nhiều sheet như cũ ---
            with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
                file_path = tmp.name
                with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
                    df_data.to_excel(writer, sheet_name='Data', index=False)
                    so_luot_in.to_excel(writer, sheet_name='Số lượt in', index=False)
                    linh_vuc.to_excel(writer, sheet_name='Lĩnh vực', index=False)
                    top_thu_tuc.to_excel(writer, sheet_name='Top thủ tục', index=False)
                    in_theo_gio.to_excel(writer, sheet_name='In theo giờ', index=False)
                    tuoi_gioitinh.to_excel(writer, sheet_name='Tuổi & Giới tính', index=False)
                    xac_thuc.to_excel(writer, sheet_name='Xác thực', index=False)
            filename = "dashboard_inphieu.xlsx"
            return FileResponse(
                file_path,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                filename=filename,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
    except Exception as e:
        print(f"Export error: {str(e)}")
        raise HTTPException(status_code=500, detail="Export báo cáo thất bại")
    finally:
        try:
            conn.close()
        except:
            pass

# ====== 10. Health check/root API ======
@app.get("/", summary="Kiểm tra server API hoạt động")
def root():
    return {"msg": "API is running!"}