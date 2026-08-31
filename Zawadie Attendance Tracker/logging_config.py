import logging
from logging.handlers import RotatingFileHandler

from settings import LOGS_DIR, ensure_directories

_CONFIGURED = False


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """Configure a rotating file log at logs/app.log (+ console). Idempotent."""
    global _CONFIGURED
    logger = logging.getLogger("attendance")
    if _CONFIGURED:
        return logger

    ensure_directories()
    logger.setLevel(level)

    fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    file_handler = RotatingFileHandler(
        LOGS_DIR / "app.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    console = logging.StreamHandler()
    console.setFormatter(fmt)
    logger.addHandler(console)

    _CONFIGURED = True
    logger.info("Logging started")
    return logger


def get_logger(name: str = "attendance") -> logging.Logger:
    if name == "attendance" or name.startswith("attendance."):
        return logging.getLogger(name)
    return logging.getLogger(f"attendance.{name}")
