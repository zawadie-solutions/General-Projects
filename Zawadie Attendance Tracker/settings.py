from pathlib import Path


APP_NAME = "Contractor Attendance"
BASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BASE_DIR / "database"
DATABASE_PATH = DATABASE_DIR / "employees.db"
QR_CODES_DIR = BASE_DIR / "qr_codes"
EXPORTS_DIR = BASE_DIR / "exports"
LOGS_DIR = BASE_DIR / "logs"
LOGO_PATH = BASE_DIR / "assets" / "logo.svg"

DEFAULT_ADMIN_USERNAME = "Zawadie Solutions"
DEFAULT_ADMIN_PASSWORD = "admin"

ATTENDANCE_HEADERS = [
    "Date",
    "Contractor ID",
    "Name",
    "Gender",
    "Department",
    "Sign In",
    "Sign Out",
    "Hours",
]


def ensure_directories() -> None:
    DATABASE_DIR.mkdir(exist_ok=True)
    QR_CODES_DIR.mkdir(exist_ok=True)
    EXPORTS_DIR.mkdir(exist_ok=True)
    LOGS_DIR.mkdir(exist_ok=True)
