from datetime import datetime, timedelta
from typing import Any

from database import Database
from logging_config import get_logger

log = get_logger("attendance")

# How far back a still-open sign-in can be closed by the next scan (overnight
# shift). Beyond this the old record is left for an admin to correct and the
# scan starts a fresh day.
OVERNIGHT_GRACE = timedelta(hours=18)


def calculate_hours(sign_in: str | None, sign_out: str | None) -> str:
    if not sign_in or not sign_out:
        return ""
    try:
        start = datetime.strptime(sign_in, "%I:%M %p")
        end = datetime.strptime(sign_out, "%I:%M %p")
    except ValueError:
        return ""
    minutes = int((end - start).total_seconds() // 60)
    if minutes < 0:
        # Clock-out time is earlier than clock-in — the shift ran past midnight.
        minutes += 24 * 60
    if minutes < 0:
        return ""
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


class AttendanceService:
    def __init__(self, db: Database):
        self.db = db

    def record_scan(self, employee_id: str) -> dict[str, Any]:
        employee_id = employee_id.strip()
        employee = self.db.get_employee(employee_id)
        if not employee:
            return {
                "ok": False,
                "message": f"Employee {employee_id} was not found.",
                "employee_id": employee_id,
            }

        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        now_time = now.strftime("%I:%M %p")
        existing = self.db.get_attendance_for_date(today, employee_id)
        overnight = None if existing else self._open_overnight_record(employee_id, now)

        if existing and existing.get("sign_out"):
            return {
                "ok": False,
                "message": f"{employee['full_name']} already signed out today.",
                "employee": employee,
                "attendance": existing,
            }
        elif existing:
            record_date = today
            attendance = self.db.update_sign_out(record_date, employee_id, now_time)
            status, greeting = "Sign Out", "Goodbye"
        elif overnight:
            record_date = overnight["attendance_date"]
            attendance = self.db.update_sign_out(record_date, employee_id, now_time)
            status, greeting = "Sign Out", "Goodbye"
            log.info("%s signed out overnight against %s", employee_id, record_date)
        else:
            record_date = today
            attendance = self.db.create_sign_in(record_date, employee_id, now_time)
            status, greeting = "Sign In", "Welcome"

        return {
            "ok": True,
            "employee": employee,
            "attendance": attendance,
            "status": status,
            "greeting": greeting,
            "time": now_time,
        }

    def _open_overnight_record(self, employee_id: str, now: datetime) -> dict[str, Any] | None:
        """An unclosed sign-in from a previous day, recent enough to close now."""
        record = self.db.get_open_attendance(employee_id)
        if not record or not record.get("sign_in"):
            return None
        try:
            started = datetime.strptime(
                f"{record['attendance_date']} {record['sign_in']}", "%Y-%m-%d %I:%M %p"
            )
        except ValueError:
            return None
        if started.strftime("%Y-%m-%d") == now.strftime("%Y-%m-%d"):
            return None  # same day — handled by the normal path
        if now - started > OVERNIGHT_GRACE:
            return None  # too stale — leave it for an admin to correct
        return record
