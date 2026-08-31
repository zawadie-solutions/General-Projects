from datetime import datetime, timedelta
from typing import Any

from database import Database
from logging_config import get_logger

log = get_logger("attendance")

# How far back a still-open sign-in can be closed by the next scan (overnight
# shift). Beyond this the old record is left for an admin to correct and the
# scan starts a fresh day.
OVERNIGHT_GRACE = timedelta(hours=18)

# A contractor gets one free sign-in/out cycle per day. A second cycle is
# allowed but must be justified with a reason (e.g. stepped away for a call);
# beyond that, sign-ins are refused outright for the rest of the day.
MAX_SESSIONS_PER_DAY = 2


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
        now_time = now.strftime("%I:%M %p")

        overnight = self._open_overnight_record(employee_id, now)
        if overnight:
            attendance = self.db.update_sign_out(
                overnight["attendance_date"], employee_id, now_time, overnight["session_number"]
            )
            log.info("%s signed out overnight against %s", employee_id, overnight["attendance_date"])
            return {
                "ok": True,
                "employee": employee,
                "attendance": attendance,
                "status": "Sign Out",
                "greeting": "Goodbye",
                "time": now_time,
            }

        today = now.strftime("%Y-%m-%d")
        sessions = self.db.get_attendance_sessions_for_date(today, employee_id)
        open_session = next((s for s in sessions if not s.get("sign_out")), None)

        if open_session:
            attendance = self.db.update_sign_out(
                today, employee_id, now_time, open_session["session_number"]
            )
            return {
                "ok": True,
                "employee": employee,
                "attendance": attendance,
                "status": "Sign Out",
                "greeting": "Goodbye",
                "time": now_time,
            }

        completed = len(sessions)
        if completed == 0:
            attendance = self.db.create_sign_in(today, employee_id, now_time, session_number=1)
            return {
                "ok": True,
                "employee": employee,
                "attendance": attendance,
                "status": "Sign In",
                "greeting": "Welcome",
                "time": now_time,
            }

        if completed < MAX_SESSIONS_PER_DAY:
            return {
                "ok": False,
                "needs_reason": True,
                "employee": employee,
                "employee_id": employee_id,
                "message": f"{employee['full_name']} already signed out today. Why do you need to sign in again?",
            }

        return {
            "ok": False,
            "employee": employee,
            "message": f"{employee['full_name']} has used today's sign-ins. No more sign-ins allowed today.",
        }

    def record_reentry(self, employee_id: str, reason: str) -> dict[str, Any]:
        """Complete a sign-in that was gated behind a reason (the day's 2nd session)."""
        employee_id = employee_id.strip()
        employee = self.db.get_employee(employee_id)
        if not employee:
            return {
                "ok": False,
                "message": f"Employee {employee_id} was not found.",
                "employee_id": employee_id,
            }

        reason = reason.strip()
        if not reason:
            return {"ok": False, "employee": employee, "message": "A reason is required to sign in again."}

        now = datetime.now()
        today = now.strftime("%Y-%m-%d")
        now_time = now.strftime("%I:%M %p")
        sessions = self.db.get_attendance_sessions_for_date(today, employee_id)

        if any(not s.get("sign_out") for s in sessions):
            return {"ok": False, "employee": employee, "message": f"{employee['full_name']} is already signed in."}

        completed = len(sessions)
        if completed == 0 or completed >= MAX_SESSIONS_PER_DAY:
            return {"ok": False, "employee": employee, "message": "Re-entry is no longer available for today."}

        attendance = self.db.create_sign_in(
            today, employee_id, now_time, session_number=completed + 1, reason=reason
        )
        log.info("%s re-signed in with reason: %s", employee_id, reason)
        return {
            "ok": True,
            "employee": employee,
            "attendance": attendance,
            "status": "Sign In",
            "greeting": "Welcome back",
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
