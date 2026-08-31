import hashlib
import hmac
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from settings import DATABASE_PATH, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_USERNAME, ensure_directories

_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt_hex, digest_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        expected = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iterations)
        )
        return hmac.compare_digest(expected.hex(), digest_hex)
    except (ValueError, AttributeError):
        return False


class Database:
    def __init__(self, db_path: Path = DATABASE_PATH):
        ensure_directories()
        self.db_path = db_path
        self.initialize()

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS employees (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    gender TEXT NOT NULL,
                    department TEXT NOT NULL,
                    position TEXT NOT NULL,
                    qr_path TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS attendance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attendance_date TEXT NOT NULL,
                    employee_id TEXT NOT NULL,
                    sign_in TEXT,
                    sign_out TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(attendance_date, employee_id),
                    FOREIGN KEY(employee_id) REFERENCES employees(employee_id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS app_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
                """
            )
            defaults = {
                "admin_username": DEFAULT_ADMIN_USERNAME,
                "admin_password": hash_password(DEFAULT_ADMIN_PASSWORD),
                "camera_index": "0",
            }
            conn.executemany(
                "INSERT OR IGNORE INTO app_settings(key, value) VALUES(?, ?)",
                defaults.items(),
            )

    def get_setting(self, key: str, default: str = "") -> str:
        with self.connect() as conn:
            row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str) -> None:
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO app_settings(key, value)
                VALUES(?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )

    def set_admin_password(self, password: str) -> None:
        self.set_setting("admin_password", hash_password(password))

    def verify_admin_password(self, password: str) -> bool:
        stored = self.get_setting("admin_password", "")
        if stored.startswith("pbkdf2_sha256$"):
            return verify_password(password, stored)
        # Legacy plaintext value — accept once, then upgrade to a hash in place.
        if password == stored:
            self.set_admin_password(password)
            return True
        return False

    def next_employee_id(self) -> str:
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT employee_id
                FROM employees
                WHERE employee_id LIKE 'EMP%'
                ORDER BY CAST(SUBSTR(employee_id, 4) AS INTEGER) DESC
                LIMIT 1
                """
            ).fetchone()
        if not row:
            return "EMP001"
        number = int(row["employee_id"][3:]) + 1
        return f"EMP{number:03d}"

    def add_employee(
        self,
        full_name: str,
        gender: str,
        department: str,
        position: str,
        qr_path: str,
        employee_id: str | None = None,
    ) -> dict[str, Any]:
        new_id = employee_id or self.next_employee_id()
        now = datetime.now().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO employees(employee_id, full_name, gender, department, position, qr_path, created_at)
                VALUES(?, ?, ?, ?, ?, ?, ?)
                """,
                (new_id, full_name.strip(), gender.strip(), department.strip(), position.strip(), qr_path, now),
            )
        return self.get_employee(new_id) or {}

    def update_employee_qr_path(self, employee_id: str, qr_path: str) -> None:
        with self.connect() as conn:
            conn.execute("UPDATE employees SET qr_path = ? WHERE employee_id = ?", (qr_path, employee_id))

    def update_employee(
        self, employee_id: str, full_name: str, gender: str, department: str, position: str,
    ) -> dict[str, Any]:
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE employees
                SET full_name = ?, gender = ?, department = ?, position = ?
                WHERE employee_id = ?
                """,
                (full_name.strip(), gender.strip(), department.strip(), position.strip(), employee_id),
            )
        return self.get_employee(employee_id) or {}

    def get_employee(self, employee_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM employees WHERE employee_id = ?", (employee_id,)).fetchone()
            return dict(row) if row else None

    def list_employees(self, search: str = "") -> list[dict[str, Any]]:
        params: tuple[Any, ...] = ()
        where = ""
        if search:
            like = f"%{search.strip()}%"
            where = "WHERE employee_id LIKE ? OR full_name LIKE ? OR department LIKE ? OR position LIKE ?"
            params = (like, like, like, like)
        with self.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT *
                FROM employees
                {where}
                ORDER BY CAST(SUBSTR(employee_id, 4) AS INTEGER), full_name
                """,
                params,
            ).fetchall()
            return [dict(row) for row in rows]

    def delete_employee(self, employee_id: str) -> None:
        with self.connect() as conn:
            conn.execute("DELETE FROM attendance WHERE employee_id = ?", (employee_id,))
            conn.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))

    def get_attendance_for_date(self, attendance_date: str, employee_id: str) -> dict[str, Any] | None:
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT a.*, e.full_name, e.gender, e.department, e.position
                FROM attendance a
                JOIN employees e ON e.employee_id = a.employee_id
                WHERE a.attendance_date = ? AND a.employee_id = ?
                """,
                (attendance_date, employee_id),
            ).fetchone()
            return dict(row) if row else None

    def get_open_attendance(self, employee_id: str) -> dict[str, Any] | None:
        """Most recent attendance row for this employee that has no sign-out yet."""
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT a.*, e.full_name, e.gender, e.department, e.position
                FROM attendance a
                JOIN employees e ON e.employee_id = a.employee_id
                WHERE a.employee_id = ? AND a.sign_out IS NULL
                ORDER BY a.attendance_date DESC
                LIMIT 1
                """,
                (employee_id,),
            ).fetchone()
            return dict(row) if row else None

    def create_sign_in(self, attendance_date: str, employee_id: str, sign_in: str) -> dict[str, Any]:
        now = datetime.now().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO attendance(attendance_date, employee_id, sign_in, sign_out, created_at, updated_at)
                VALUES(?, ?, ?, NULL, ?, ?)
                """,
                (attendance_date, employee_id, sign_in, now, now),
            )
        return self.get_attendance_for_date(attendance_date, employee_id) or {}

    def update_sign_out(self, attendance_date: str, employee_id: str, sign_out: str) -> dict[str, Any]:
        now = datetime.now().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE attendance
                SET sign_out = ?, updated_at = ?
                WHERE attendance_date = ? AND employee_id = ?
                """,
                (sign_out, now, attendance_date, employee_id),
            )
        return self.get_attendance_for_date(attendance_date, employee_id) or {}

    def set_attendance_times(
        self, attendance_date: str, employee_id: str,
        sign_in: str | None, sign_out: str | None,
    ) -> None:
        now = datetime.now().isoformat(timespec="seconds")
        with self.connect() as conn:
            conn.execute(
                """
                UPDATE attendance
                SET sign_in = ?, sign_out = ?, updated_at = ?
                WHERE attendance_date = ? AND employee_id = ?
                """,
                (sign_in or None, sign_out or None, now, attendance_date, employee_id),
            )

    def delete_attendance(self, attendance_date: str, employee_id: str) -> None:
        with self.connect() as conn:
            conn.execute(
                "DELETE FROM attendance WHERE attendance_date = ? AND employee_id = ?",
                (attendance_date, employee_id),
            )

    def attendance_report(
        self,
        start_date: str | None = None,
        end_date: str | None = None,
        department: str = "",
        name: str = "",
    ) -> list[dict[str, Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if start_date:
            clauses.append("a.attendance_date >= ?")
            params.append(start_date)
        if end_date:
            clauses.append("a.attendance_date <= ?")
            params.append(end_date)
        if department:
            clauses.append("e.department LIKE ?")
            params.append(f"%{department}%")
        if name:
            clauses.append("e.full_name LIKE ?")
            params.append(f"%{name}%")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self.connect() as conn:
            rows = conn.execute(
                f"""
                SELECT a.attendance_date, e.employee_id, e.full_name, e.gender, e.department,
                       a.sign_in, a.sign_out
                FROM attendance a
                JOIN employees e ON e.employee_id = a.employee_id
                {where}
                ORDER BY a.attendance_date DESC, e.full_name
                """,
                params,
            ).fetchall()
            return [dict(row) for row in rows]

    def departments(self) -> list[str]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT DISTINCT department FROM employees WHERE department <> '' ORDER BY department"
            ).fetchall()
            return [row["department"] for row in rows]
