"""Logic tests for the attendance core.

Run directly:      python tests/test_attendance.py
Or with pytest:    pytest
Every test uses a throwaway SQLite file in a temp dir — the real
database/employees.db is never touched.
"""
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import attendance as attendance_mod
from attendance import AttendanceService, calculate_hours
from database import Database, hash_password, verify_password


def _new_db() -> Database:
    tmp = Path(tempfile.mkdtemp())
    return Database(tmp / "test.db")


def _add_employee(db: Database, name: str = "Alice") -> str:
    return db.add_employee(name, "Female", "Build", "Hand", "qr.png")["employee_id"]


# ── calculate_hours ───────────────────────────────────────────────────

def test_calculate_hours_normal_shift():
    assert calculate_hours("08:00 AM", "05:00 PM") == "09:00"


def test_calculate_hours_missing_value():
    assert calculate_hours("08:00 AM", None) == ""
    assert calculate_hours(None, "05:00 PM") == ""


def test_calculate_hours_crossing_midnight():
    assert calculate_hours("10:00 PM", "06:00 AM") == "08:00"
    assert calculate_hours("11:30 PM", "12:15 AM") == "00:45"


# ── passwords ─────────────────────────────────────────────────────────

def test_password_hash_roundtrip():
    h = hash_password("hunter2")
    assert verify_password("hunter2", h)
    assert not verify_password("wrong", h)


def test_default_admin_password_is_hashed():
    db = _new_db()
    assert db.get_setting("admin_password").startswith("pbkdf2_sha256$")
    assert db.verify_admin_password("admin")


def test_legacy_plaintext_password_upgrades_on_verify():
    db = _new_db()
    db.set_setting("admin_password", "plain")
    assert db.verify_admin_password("plain")
    assert db.get_setting("admin_password").startswith("pbkdf2_sha256$")
    assert not db.verify_admin_password("plain2")


# ── scan flow ─────────────────────────────────────────────────────────

def test_sign_in_then_sign_out_same_day():
    db = _new_db()
    svc = AttendanceService(db)
    eid = _add_employee(db)
    assert svc.record_scan(eid)["status"] == "Sign In"
    assert svc.record_scan(eid)["status"] == "Sign Out"
    third = svc.record_scan(eid)
    assert not third["ok"] and "already signed out" in third["message"]


def test_unknown_id_is_rejected():
    svc = AttendanceService(_new_db())
    assert not svc.record_scan("GHOST")["ok"]


def test_overnight_open_record_is_closed_within_grace():
    db = _new_db()
    svc = AttendanceService(db)
    eid = _add_employee(db)
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    db.create_sign_in(yesterday, eid, "11:30 PM")

    original = attendance_mod.OVERNIGHT_GRACE
    attendance_mod.OVERNIGHT_GRACE = timedelta(days=1, hours=6)
    try:
        result = svc.record_scan(eid)
    finally:
        attendance_mod.OVERNIGHT_GRACE = original

    assert result["status"] == "Sign Out"
    assert result["attendance"]["attendance_date"] == yesterday


def test_stale_open_record_beyond_grace_starts_fresh():
    db = _new_db()
    svc = AttendanceService(db)
    eid = _add_employee(db)
    old = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
    db.create_sign_in(old, eid, "09:00 AM")
    assert svc.record_scan(eid)["status"] == "Sign In"


# ── admin corrections ─────────────────────────────────────────────────

def test_set_attendance_times_and_delete():
    db = _new_db()
    svc = AttendanceService(db)
    eid = _add_employee(db)
    svc.record_scan(eid)
    today = datetime.now().strftime("%Y-%m-%d")

    db.set_attendance_times(today, eid, "07:30 AM", "04:00 PM")
    rec = db.get_attendance_for_date(today, eid)
    assert (rec["sign_in"], rec["sign_out"]) == ("07:30 AM", "04:00 PM")

    db.delete_attendance(today, eid)
    assert db.get_attendance_for_date(today, eid) is None


def test_next_employee_id_sequence():
    db = _new_db()
    assert db.next_employee_id() == "EMP001"
    _add_employee(db)
    _add_employee(db, "Bob")
    assert db.next_employee_id() == "EMP003"


if __name__ == "__main__":
    funcs = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failed = 0
    for fn in funcs:
        try:
            fn()
            print(f"PASS  {fn.__name__}")
        except Exception as exc:  # noqa: BLE001
            failed += 1
            print(f"FAIL  {fn.__name__}: {exc!r}")
    print(f"\n{len(funcs) - failed}/{len(funcs)} passed")
    sys.exit(1 if failed else 0)
