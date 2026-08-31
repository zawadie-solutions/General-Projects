# Employee Attendance

Windows desktop attendance application built with Python, PySide6, SQLite, QR codes, and OpenCV/pyzbar. Runs fully offline — all data is stored locally.

## Features

- Admin login (password stored hashed, not plaintext)
- Employee registration with automatic `EMP001`, `EMP002`, ... IDs
- QR code PNG generation and download
- Employee list with QR regeneration, download, and delete
- QR scanner that starts automatically, recovers from camera disconnects,
  and beeps on each scan (rising tone = recorded, low buzz = rejected)
- Double-scan protection — a badge held in view is recorded once, not
  signed in and straight back out
- Manual scan field for testing, for example `EMP001`
- Sign in / sign out detection per employee per day, including overnight
  shifts (a forgotten sign-out is closed by the next scan within 18 hours)
- Local SQLite storage — all data stays on this machine
- Attendance filters by date, department, and name
- Admin can edit or delete individual attendance rows
- Export to CSV, Excel, and PDF (choose where to save)
- Rotating activity log at `logs/app.log`

## Setup

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

You can also double-click `Start Employee Attendance.bat`.

Default admin login:

```text
admin / admin
```

The app opens directly to the employee scanner. Employees click `Open Camera` when they are ready to scan, then `Stop` returns the camera area to `Camera preview`.

Click `Admin Login` to access registration, reports, settings, and employee management in the same window. Use `Back to Employee Scanner` to return to the daily employee scanner. Change the admin username and password in the Settings page (leave `New Password` blank to keep the current one). If the wrong camera opens, set the camera number in Settings.

## Project Structure

```text
EmployeeAttendance/
  app.py
  attendance.py
  database.py
  employees.py
  logging_config.py
  qr_generator.py
  qr_scanner.py
  reports.py
  settings.py
  assets/
  qr_codes/
  database/
  exports/
  logs/
  tests/
```

## Tests

```powershell
python tests/test_attendance.py
```

Each test runs against a throwaway SQLite file, so `database/employees.db` is never touched.

## Notes

- `pyzbar` may require the ZBar runtime on Windows. The scanner falls back to OpenCV QR detection if ZBar is not available.
- On Windows the camera opens through the DirectShow backend; decoding runs on a grayscale frame every other frame to keep CPU use low.
- Use the manual scanner field to test attendance without a camera.
- The SQLite database is created at `database/employees.db`.
- Runtime problems are written to `logs/app.log` (rotates at ~1 MB, keeps 5 files).
