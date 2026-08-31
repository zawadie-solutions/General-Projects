import shutil
import sys
import threading
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QDate, Qt, QTimer
from PySide6.QtGui import QImage, QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QDateEdit,
    QDialog,
    QFileDialog,
    QFormLayout,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSizePolicy,
    QStackedWidget,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from attendance import AttendanceService, calculate_hours
from database import Database
from employees import EmployeeService
from logging_config import get_logger, setup_logging
from qr_scanner import ScannerThread
from reports import display_date, export_csv, export_excel, export_pdf
from settings import APP_NAME, DEFAULT_ADMIN_USERNAME, EXPORTS_DIR, QR_CODES_DIR, ensure_directories

log = get_logger("ui")

# ── Colours (match logo palette) ─────────────────────────────────────────────
PINK    = "#D81B60"   # primary — logo's magenta/pink
PINK_D  = "#B5174F"   # primary hover
TEAL    = "#00897B"   # secondary — logo's teal
TEAL_D  = "#00695C"   # secondary hover
GOLD    = "#F5A623"   # accent — logo's amber/gold
DARK    = "#1A1033"   # sidebar / header background
BG      = "#F7F8FC"   # page background
CARD    = "#FFFFFF"   # card background
BORDER  = "#E8ECF4"
TEXT    = "#1E293B"
MUTED   = "#64748B"


def play_feedback_sound(success: bool) -> None:
    """Short audible cue on scan — a rising note for OK, a low buzz for rejected.

    Runs on a daemon thread so the ~200ms of tones never stalls the scanner UI.
    """
    def _play() -> None:
        try:
            import winsound

            if success:
                winsound.Beep(1180, 90)
                winsound.Beep(1570, 110)
            else:
                winsound.Beep(430, 260)
        except Exception:
            try:
                QApplication.beep()
            except Exception:
                pass

    threading.Thread(target=_play, daemon=True).start()


# ── Pages ─────────────────────────────────────────────────────────────────────

class LoginDialog(QDialog):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.setWindowTitle(f"{APP_NAME} – Admin Login")
        self.setFixedSize(390, 270)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(36, 36, 36, 36)
        layout.setSpacing(12)

        title = QLabel("Admin Login")
        title.setObjectName("title")
        layout.addWidget(title)

        hint = muted_label("Enter your administrator credentials to continue.")
        layout.addWidget(hint)
        layout.addSpacing(6)

        form = QFormLayout()
        form.setSpacing(10)
        self.username = QLineEdit(self.db.get_setting("admin_username", DEFAULT_ADMIN_USERNAME))
        self.username.setReadOnly(True)
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)
        self.password.setFocus()
        self.password.returnPressed.connect(self.try_login)
        form.addRow("Username", self.username)
        form.addRow("Password", self.password)
        layout.addLayout(form)
        layout.addSpacing(8)

        btn = QPushButton("Login")
        btn.setMinimumHeight(40)
        btn.clicked.connect(self.try_login)
        layout.addWidget(btn)

    def try_login(self) -> None:
        u = self.db.get_setting("admin_username", DEFAULT_ADMIN_USERNAME)
        if self.username.text().strip() == u and self.db.verify_admin_password(self.password.text()):
            self.accept()
            return
        QMessageBox.warning(self, "Login Failed", "Username or password is incorrect.")


class RegisterPage(QWidget):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.employee_service = EmployeeService(db)
        self.last_employee: dict | None = None

        layout = QGridLayout(self)
        layout.setSpacing(16)
        layout.setColumnStretch(0, 2)
        layout.setColumnStretch(1, 1)

        form_panel = panel()
        fl = QVBoxLayout(form_panel)
        fl.setSpacing(10)
        fl.addWidget(heading("Register Contractor"))
        fl.addWidget(muted_label("Fill in the details below. A QR code will be generated automatically."))
        fl.addSpacing(6)

        form = QFormLayout()
        form.setSpacing(10)
        self.full_name = QLineEdit()
        self.full_name.setPlaceholderText("e.g. John Smith")
        self.gender = QComboBox()
        self.gender.addItems(["Male", "Female", "Other"])
        self.department = QLineEdit()
        self.department.setPlaceholderText("e.g. Construction")
        self.position = QLineEdit()
        self.position.setPlaceholderText("e.g. Site Foreman")
        form.addRow("Full Name *", self.full_name)
        form.addRow("Gender", self.gender)
        form.addRow("Department *", self.department)
        form.addRow("Position *", self.position)
        fl.addLayout(form)
        fl.addSpacing(8)

        self.register_button = QPushButton("✚  Register Contractor")
        self.register_button.setMinimumHeight(42)
        self.register_button.clicked.connect(self.register_employee)
        fl.addWidget(self.register_button)
        fl.addStretch()
        layout.addWidget(form_panel, 0, 0)

        result_panel = panel()
        rl = QVBoxLayout(result_panel)
        rl.setSpacing(10)
        rl.addWidget(heading("Generated QR Code"))
        self.summary = QLabel("Register a contractor to generate a QR code.")
        self.summary.setObjectName("muted")
        self.summary.setWordWrap(True)
        self.qr_preview = QLabel()
        self.qr_preview.setAlignment(Qt.AlignCenter)
        self.qr_preview.setMinimumSize(220, 220)
        self.qr_preview.setObjectName("qrPreview")
        self.download_button = QPushButton("⬇  Download QR Code")
        self.download_button.setEnabled(False)
        self.download_button.clicked.connect(self.download_qr)
        rl.addWidget(self.summary)
        rl.addWidget(self.qr_preview, stretch=1)
        rl.addWidget(self.download_button)
        layout.addWidget(result_panel, 0, 1)

    def register_employee(self) -> None:
        if not self.full_name.text().strip() or not self.department.text().strip() or not self.position.text().strip():
            QMessageBox.warning(self, "Missing Details", "Full name, department, and position are required.")
            return
        emp = self.employee_service.register(
            self.full_name.text(), self.gender.currentText(),
            self.department.text(), self.position.text(),
        )
        self.last_employee = emp
        self.summary.setText(
            f"Contractor ID: {emp['employee_id']}\n"
            f"Name: {emp['full_name']}\n"
            f"Department: {emp['department']}\n"
            f"Position: {emp['position']}"
        )
        pixmap = QPixmap(emp["qr_path"])
        self.qr_preview.setPixmap(pixmap.scaled(220, 220, Qt.KeepAspectRatio, Qt.SmoothTransformation))
        self.download_button.setEnabled(True)
        self.full_name.clear()
        self.department.clear()
        self.position.clear()

    def download_qr(self) -> None:
        if not self.last_employee:
            return
        src = Path(self.last_employee["qr_path"])
        dest, _ = QFileDialog.getSaveFileName(
            self, "Save QR Code", str(QR_CODES_DIR / src.name), "PNG Images (*.png)"
        )
        if dest:
            shutil.copy2(src, dest)
            QMessageBox.information(self, "Saved", f"QR code saved to:\n{dest}")


class ContractorEditDialog(QDialog):
    """Edit a contractor's name, gender, department, or position (e.g. after a promotion)."""

    def __init__(self, employee: dict, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Contractor")
        self.setFixedWidth(360)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(12)

        layout.addWidget(heading(employee.get("employee_id", "")))

        form = QFormLayout()
        form.setSpacing(10)
        self.full_name = QLineEdit(employee.get("full_name", ""))
        self.gender = QComboBox()
        self.gender.addItems(["Male", "Female", "Other"])
        self.gender.setCurrentText(employee.get("gender", "Male"))
        self.department = QLineEdit(employee.get("department", ""))
        self.position = QLineEdit(employee.get("position", ""))
        form.addRow("Full Name", self.full_name)
        form.addRow("Gender", self.gender)
        form.addRow("Department", self.department)
        form.addRow("Position", self.position)
        layout.addLayout(form)

        btns = QHBoxLayout()
        cancel = QPushButton("Cancel")
        cancel.setObjectName("secondaryButton")
        cancel.clicked.connect(self.reject)
        save = QPushButton("Save")
        save.clicked.connect(self._save)
        btns.addWidget(cancel)
        btns.addWidget(save)
        layout.addLayout(btns)

    def _save(self) -> None:
        if not self.full_name.text().strip() or not self.department.text().strip() or not self.position.text().strip():
            QMessageBox.warning(self, "Missing Details", "Full name, department, and position are required.")
            return
        self.accept()

    def values(self) -> tuple[str, str, str, str]:
        return (
            self.full_name.text().strip(),
            self.gender.currentText(),
            self.department.text().strip(),
            self.position.text().strip(),
        )


class EmployeeListPage(QWidget):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.employee_service = EmployeeService(db)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        top = QHBoxLayout()
        top.addWidget(heading("Contractor List"))
        top.addStretch()
        self.search = QLineEdit()
        self.search.setPlaceholderText("Search by name, department or position...")
        self.search.setMinimumWidth(300)
        self.search.textChanged.connect(self.load)
        top.addWidget(self.search)
        layout.addLayout(top)

        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(
            ["Contractor ID", "Name", "Gender", "Department", "Position", "QR Path"]
        )
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setSelectionMode(QTableWidget.ExtendedSelection)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setAlternatingRowColors(True)
        self.table.itemSelectionChanged.connect(self._update_action_labels)
        layout.addWidget(self.table)

        actions = QHBoxLayout()
        self.download_button = QPushButton("⬇  Download QR")
        self.download_button.setObjectName("secondaryButton")
        self.edit_button = QPushButton("✎  Edit Contractor")
        self.edit_button.setObjectName("secondaryButton")
        self.delete_button = QPushButton("✕  Delete Contractor")
        self.delete_button.setObjectName("dangerButton")
        self.download_button.clicked.connect(self.download_qr)
        self.edit_button.clicked.connect(self.edit_employee)
        self.delete_button.clicked.connect(self.delete_employee)
        actions.addWidget(self.download_button)
        actions.addWidget(self.edit_button)
        actions.addStretch()
        actions.addWidget(self.delete_button)
        layout.addLayout(actions)
        self.load()

    def _update_action_labels(self) -> None:
        count = len(self.table.selectionModel().selectedRows())
        self.delete_button.setText(
            f"✕  Delete {count} Contractors" if count > 1 else "✕  Delete Contractor"
        )
        self.download_button.setEnabled(count <= 1)
        self.edit_button.setEnabled(count <= 1)

    def load(self) -> None:
        employees = self.db.list_employees(self.search.text())
        self.table.setRowCount(len(employees))
        for row, emp in enumerate(employees):
            for col, val in enumerate([
                emp["employee_id"], emp["full_name"], emp["gender"],
                emp["department"], emp["position"], emp["qr_path"],
            ]):
                self.table.setItem(row, col, QTableWidgetItem(str(val)))
        self.table.resizeColumnsToContents()

    def _selected_id(self) -> str | None:
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            QMessageBox.information(self, "Select Contractor", "Please select a contractor first.")
            return None
        return self.table.item(rows[0].row(), 0).text()

    def _selected_ids(self) -> list[str]:
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            QMessageBox.information(self, "Select Contractor", "Please select at least one contractor first.")
            return []
        return [self.table.item(r.row(), 0).text() for r in rows]

    def download_qr(self) -> None:
        eid = self._selected_id()
        if not eid:
            return
        emp = self.db.get_employee(eid)
        if not emp:
            return
        src = Path(emp["qr_path"])
        if not src.exists():
            src = self.employee_service.regenerate_qr(eid)
        dest, _ = QFileDialog.getSaveFileName(
            self, "Save QR Code", str(QR_CODES_DIR / src.name), "PNG Images (*.png)"
        )
        if dest:
            shutil.copy2(src, dest)

    def edit_employee(self) -> None:
        eid = self._selected_id()
        if not eid:
            return
        emp = self.db.get_employee(eid)
        if not emp:
            return
        dlg = ContractorEditDialog(emp, self)
        if dlg.exec() != QDialog.Accepted:
            return
        full_name, gender, department, position = dlg.values()
        self.db.update_employee(eid, full_name, gender, department, position)
        log.info("Edited contractor %s", eid)
        self.load()

    def delete_employee(self) -> None:
        eids = self._selected_ids()
        if not eids:
            return
        if len(eids) == 1:
            question = f"Delete {eids[0]} and all their attendance records?\nThis cannot be undone."
        else:
            question = (
                f"Delete {len(eids)} contractors ({', '.join(eids)}) "
                "and all their attendance records?\nThis cannot be undone."
            )
        reply = QMessageBox.question(self, "Delete Contractor", question)
        if reply == QMessageBox.Yes:
            for eid in eids:
                self.db.delete_employee(eid)
            self.load()


class ScannerPage(QWidget):
    def __init__(self, db: Database, auto_start: bool = False):
        super().__init__()
        self.db = db
        self.attendance_service = AttendanceService(db)
        self.scanner: ScannerThread | None = None
        self.is_stopping_scanner = False
        self.auto_start = auto_start
        self._auto_start_done = False

        # Double-scan guard: once a code is accepted it stays "latched" and is
        # ignored until it has been out of the camera's view for ~2s. Every
        # sighting of the latched code refreshes the timer, so holding a badge
        # up can never sign you in and straight back out.
        self.latched_value = ""
        self._unlatch_timer = QTimer(self)
        self._unlatch_timer.setSingleShot(True)
        self._unlatch_timer.setInterval(2000)
        self._unlatch_timer.timeout.connect(self._clear_latch)

        layout = QGridLayout(self)
        layout.setSpacing(16)
        layout.setColumnStretch(0, 3)
        layout.setColumnStretch(1, 1)

        # Left column: camera panel + buttons stacked vertically
        left_col = QWidget()
        left_col.setObjectName("mainContent")
        left_layout = QVBoxLayout(left_col)
        left_layout.setContentsMargins(0, 0, 0, 0)
        left_layout.setSpacing(12)

        # Camera panel (heading + preview only — no buttons inside)
        cam_panel = panel()
        cl = QVBoxLayout(cam_panel)
        cl.setSpacing(10)
        cl.setContentsMargins(16, 16, 16, 16)
        cl.addWidget(heading("QR Code Scanner"))
        self.preview = QLabel("Camera inactive\nClick  Start Camera  to begin")
        self.preview.setAlignment(Qt.AlignCenter)
        self.preview.setMinimumSize(640, 400)
        self.preview.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.preview.setObjectName("cameraPreview")
        cl.addWidget(self.preview, stretch=1)
        left_layout.addWidget(cam_panel, stretch=1)

        # Buttons live BELOW the panel, never inside it
        cam_btns = QHBoxLayout()
        cam_btns.setSpacing(10)
        self.start_button = QPushButton("▶  Start Camera")
        self.stop_button = QPushButton("◼  Stop Camera")
        self.start_button.setFixedHeight(40)
        self.stop_button.setFixedHeight(40)
        self.start_button.setMinimumWidth(160)
        self.stop_button.setMinimumWidth(160)
        self.stop_button.setObjectName("secondaryButton")
        self.stop_button.setEnabled(False)
        self.start_button.clicked.connect(self.start_scanner)
        self.stop_button.clicked.connect(self.stop_scanner)
        cam_btns.addStretch()
        cam_btns.addWidget(self.start_button)
        cam_btns.addWidget(self.stop_button)
        cam_btns.addStretch()
        left_layout.addLayout(cam_btns)

        layout.addWidget(left_col, 0, 0)

        # Status panel
        self.status_panel = QFrame()
        self.status_panel.setObjectName("statusPanel")
        sl = QVBoxLayout(self.status_panel)
        sl.setSpacing(6)

        self.clock_label = QLabel()
        self.clock_label.setObjectName("liveClock")
        self.clock_label.setAlignment(Qt.AlignCenter)
        self.date_label = QLabel()
        self.date_label.setObjectName("liveDate")
        self.date_label.setAlignment(Qt.AlignCenter)
        sl.addWidget(self.clock_label)
        sl.addWidget(self.date_label)

        div1 = QFrame(); div1.setFrameShape(QFrame.HLine); div1.setObjectName("divider")
        sl.addWidget(div1)
        sl.addSpacing(6)

        self.status_title = QLabel("Waiting...")
        self.status_title.setObjectName("statusTitle")
        self.status_title.setAlignment(Qt.AlignCenter)
        self.status_title.setWordWrap(True)
        self.status_detail = QLabel("Start the camera and scan a QR code.")
        self.status_detail.setObjectName("statusDetail")
        self.status_detail.setWordWrap(True)
        self.status_detail.setAlignment(Qt.AlignCenter)
        self.dismiss_button = QPushButton("✓  Got it")
        self.dismiss_button.setObjectName("secondaryButton")
        self.dismiss_button.setVisible(False)
        self.dismiss_button.clicked.connect(self.reset_status)
        sl.addWidget(self.status_title)
        sl.addWidget(self.status_detail)
        sl.addWidget(self.dismiss_button)
        sl.addStretch()

        div2 = QFrame(); div2.setFrameShape(QFrame.HLine); div2.setObjectName("divider")
        sl.addWidget(div2)

        sl.addWidget(muted_label("Manual Entry"))
        self.manual_scan = QLineEdit()
        self.manual_scan.setPlaceholderText("Enter Contractor ID  (e.g. EMP001)")
        self.manual_scan.returnPressed.connect(self.record_manual_scan)
        manual_btn = QPushButton("Record Scan")
        manual_btn.clicked.connect(self.record_manual_scan)
        sl.addWidget(self.manual_scan)
        sl.addWidget(manual_btn)
        layout.addWidget(self.status_panel, 0, 1)

        self._clock_timer = QTimer(self)
        self._clock_timer.timeout.connect(self._update_clock)
        self._clock_timer.start(1000)
        self._update_clock()
        self._set_neutral()

    # ── Auto-start ───────────────────────────────────────────────────

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if self.auto_start and not self._auto_start_done and not self.scanner:
            self._auto_start_done = True
            QTimer.singleShot(300, self.start_scanner)

    def _camera_index(self) -> int:
        try:
            return int(self.db.get_setting("camera_index", "0"))
        except (TypeError, ValueError):
            return 0

    # ── Clock ────────────────────────────────────────────────────────

    def _update_clock(self) -> None:
        now = datetime.now()
        self.clock_label.setText(now.strftime("%I:%M:%S %p"))
        self.date_label.setText(now.strftime("%A, %d %B %Y"))

    # ── Status colours ───────────────────────────────────────────────

    def _set_neutral(self) -> None:
        self.status_panel.setStyleSheet(
            f"QFrame#statusPanel{{background:{CARD};border:1px solid {BORDER};border-radius:12px;padding:16px;}}"
        )
        self.status_title.setStyleSheet(f"color:{TEXT};font-size:26px;font-weight:800;background:transparent;")

    def _set_signin(self) -> None:
        self.status_panel.setStyleSheet(
            f"QFrame#statusPanel{{background:#E8F5E9;border:2px solid {TEAL};border-radius:12px;padding:16px;}}"
        )
        self.status_title.setStyleSheet(f"color:{TEAL};font-size:26px;font-weight:800;background:transparent;")

    def _set_signout(self) -> None:
        self.status_panel.setStyleSheet(
            f"QFrame#statusPanel{{background:#FFF8E1;border:2px solid {GOLD};border-radius:12px;padding:16px;}}"
        )
        self.status_title.setStyleSheet(f"color:#B45309;font-size:26px;font-weight:800;background:transparent;")

    def _set_error(self) -> None:
        self.status_panel.setStyleSheet(
            "QFrame#statusPanel{background:#FEF2F2;border:2px solid #FECACA;border-radius:12px;padding:16px;}"
        )
        self.status_title.setStyleSheet("color:#DC2626;font-size:26px;font-weight:800;background:transparent;")

    # ── Scanner control ──────────────────────────────────────────────

    def start_scanner(self) -> None:
        if self.scanner:
            return
        self.is_stopping_scanner = False
        self.scanner = ScannerThread(self._camera_index())
        self.scanner.worker.frame_ready.connect(self.set_frame)
        self.scanner.worker.qr_detected.connect(self.record_scan)
        self.scanner.worker.error.connect(self.show_error)
        self.scanner.worker.info.connect(self.show_info)
        self.scanner.thread.finished.connect(self.scanner_finished)
        self.scanner.start()
        self.start_button.setEnabled(False)
        self.stop_button.setEnabled(True)
        self.status_title.setText("Scanning...")
        self.status_detail.setText("Camera active — hold QR code in view.")
        self._set_neutral()

    def stop_scanner(self) -> None:
        if self.scanner:
            self.is_stopping_scanner = True
            self.scanner.stop()
        self.start_button.setEnabled(not self.scanner)
        self.stop_button.setEnabled(False)
        self.preview.clear()
        self.preview.setText("Camera inactive\nClick  Start Camera  to begin")
        self.reset_status()

    def scanner_finished(self) -> None:
        self.scanner = None
        self.is_stopping_scanner = False
        self._clear_latch()
        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.preview.clear()
        self.preview.setText("Camera inactive\nClick  Start Camera  to begin")

    def set_frame(self, image: QImage) -> None:
        self.preview.setPixmap(
            QPixmap.fromImage(image).scaled(self.preview.size(), Qt.KeepAspectRatio, Qt.SmoothTransformation)
        )

    def record_manual_scan(self) -> None:
        val = self.manual_scan.text().strip()
        if val:
            self.record_scan(val)
            self.manual_scan.clear()

    def _clear_latch(self) -> None:
        self.latched_value = ""

    def record_scan(self, value: str) -> None:
        value = value.strip()
        if not value:
            return
        if value == self.latched_value:
            # Same badge still in view — hold the latch open, don't re-record.
            self._unlatch_timer.start()
            return
        self.latched_value = value
        self._unlatch_timer.start()
        result = self.attendance_service.record_scan(value)
        play_feedback_sound(result["ok"])
        if result["ok"]:
            log.info("%s: %s %s", value, result["status"], result["time"])
            emp = result["employee"]
            self.status_title.setText(result["greeting"] + "!")
            self.status_detail.setText(f"{emp['full_name']}\n{result['status']} at {result['time']}")
            if result["status"] == "Sign In":
                self._set_signin()
            else:
                self._set_signout()
        else:
            self.status_title.setText("Not Recorded")
            self.status_detail.setText(result["message"])
            self._set_error()
        self.dismiss_button.setVisible(True)

    def reset_status(self) -> None:
        self.status_title.setText("Waiting...")
        self.status_detail.setText(
            "Camera active — hold QR code in view." if self.scanner
            else "Start the camera and scan a QR code."
        )
        self.dismiss_button.setVisible(False)
        self._set_neutral()

    def show_error(self, message: str) -> None:
        if self.is_stopping_scanner:
            return
        self.status_title.setText("Camera Error")
        self.status_detail.setText(message)
        self._set_error()

    def show_info(self, message: str) -> None:
        """Transient camera notices (reconnecting, waiting for device…)."""
        if self.is_stopping_scanner:
            return
        if message:
            self.status_detail.setText(message)
        elif self.scanner:
            self.status_detail.setText("Camera active — hold QR code in view.")

    def shutdown(self) -> None:
        """Stop the camera and block until its thread has exited."""
        scanner = self.scanner
        self.stop_scanner()
        if scanner is not None:
            scanner.wait(3000)

    def closeEvent(self, event) -> None:
        self.shutdown()
        super().closeEvent(event)


class AttendanceEditDialog(QDialog):
    """Correct the sign-in / sign-out times on one attendance record."""

    def __init__(self, record: dict, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Edit Attendance")
        self.setFixedWidth(360)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(12)

        who = record.get("full_name") or record.get("employee_id", "")
        layout.addWidget(heading(f"{who} — {display_date(record.get('attendance_date', ''))}"))
        layout.addWidget(muted_label("Use 12-hour times like  08:00 AM  or  05:30 PM. Leave blank to clear."))

        form = QFormLayout()
        form.setSpacing(10)
        self.sign_in = QLineEdit(record.get("sign_in") or "")
        self.sign_out = QLineEdit(record.get("sign_out") or "")
        for field in (self.sign_in, self.sign_out):
            field.setPlaceholderText("e.g. 08:00 AM")
        form.addRow("Sign In", self.sign_in)
        form.addRow("Sign Out", self.sign_out)
        layout.addLayout(form)

        btns = QHBoxLayout()
        cancel = QPushButton("Cancel")
        cancel.setObjectName("secondaryButton")
        cancel.clicked.connect(self.reject)
        save = QPushButton("Save")
        save.clicked.connect(self._save)
        btns.addWidget(cancel)
        btns.addWidget(save)
        layout.addLayout(btns)

    @staticmethod
    def _normalise(text: str) -> str | None:
        text = text.strip()
        if not text:
            return ""
        return datetime.strptime(text, "%I:%M %p").strftime("%I:%M %p")

    def _save(self) -> None:
        try:
            self._in = self._normalise(self.sign_in.text())
            self._out = self._normalise(self.sign_out.text())
        except ValueError:
            QMessageBox.warning(self, "Invalid Time", "Enter times like  08:00 AM  or  05:30 PM.")
            return
        if self._in == "" and self._out:
            QMessageBox.warning(self, "Invalid", "A record cannot have a sign-out with no sign-in.")
            return
        self.accept()

    def values(self) -> tuple[str, str]:
        return self._in, self._out


class AttendancePage(QWidget):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.records: list[dict] = []

        layout = QVBoxLayout(self)
        layout.setSpacing(12)
        layout.addWidget(heading("Attendance Records"))

        fp = panel()
        filters = QHBoxLayout(fp)
        filters.setSpacing(10)
        filters.addWidget(QLabel("From:"))
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.setDate(QDate.currentDate())
        filters.addWidget(self.start_date)
        filters.addWidget(QLabel("To:"))
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.setDate(QDate.currentDate())
        filters.addWidget(self.end_date)
        filters.addWidget(QLabel("Dept:"))
        self.department = QComboBox()
        self.department.setEditable(True)
        self.department.addItem("")
        self.department.setMinimumWidth(130)
        filters.addWidget(self.department)
        self.name = QLineEdit()
        self.name.setPlaceholderText("Search by name...")
        self.name.setMinimumWidth(150)
        filters.addWidget(self.name)
        self.refresh_button = QPushButton("⟳  Filter")
        self.refresh_button.clicked.connect(self.load)
        filters.addWidget(self.refresh_button)
        filters.addStretch()
        layout.addWidget(fp)

        self.table = QTableWidget(0, 9)
        self.table.setHorizontalHeaderLabels(
            ["Date", "Contractor ID", "Name", "Gender", "Department",
             "Sign In", "Sign Out", "Hours", "Status"]
        )
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setAlternatingRowColors(True)
        layout.addWidget(self.table)

        actions = QHBoxLayout()
        self.record_count = QLabel("0 records")
        self.record_count.setObjectName("muted")
        actions.addWidget(self.record_count)
        actions.addStretch()
        self.edit_button = QPushButton("✎  Edit Row")
        self.edit_button.setObjectName("secondaryButton")
        self.edit_button.clicked.connect(self.edit_selected)
        self.delete_button = QPushButton("✕  Delete Row")
        self.delete_button.setObjectName("dangerButton")
        self.delete_button.clicked.connect(self.delete_selected)
        actions.addWidget(self.edit_button)
        actions.addWidget(self.delete_button)
        actions.addSpacing(12)
        for label, kind in [("⬇ CSV", "csv"), ("⬇ Excel", "xlsx"), ("⬇ PDF", "pdf")]:
            btn = QPushButton(label)
            btn.setObjectName("secondaryButton")
            btn.clicked.connect(lambda _=False, k=kind: self.export(k))
            actions.addWidget(btn)
        layout.addLayout(actions)
        self.load_departments()
        self.load()

    def _selected_record(self) -> dict | None:
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            QMessageBox.information(self, "Select a Row", "Pick an attendance row first.")
            return None
        return self.records[rows[0].row()]

    def edit_selected(self) -> None:
        rec = self._selected_record()
        if not rec:
            return
        dlg = AttendanceEditDialog(rec, self)
        if dlg.exec() != QDialog.Accepted:
            return
        sign_in, sign_out = dlg.values()
        self.db.set_attendance_times(
            rec["attendance_date"], rec["employee_id"], sign_in, sign_out
        )
        log.info("Edited attendance %s/%s -> in=%r out=%r",
                 rec["employee_id"], rec["attendance_date"], sign_in, sign_out)
        self.load()

    def delete_selected(self) -> None:
        rec = self._selected_record()
        if not rec:
            return
        if QMessageBox.question(
            self, "Delete Row",
            f"Delete the {display_date(rec['attendance_date'])} record for "
            f"{rec.get('full_name') or rec['employee_id']}?",
        ) != QMessageBox.Yes:
            return
        self.db.delete_attendance(rec["attendance_date"], rec["employee_id"])
        log.info("Deleted attendance %s/%s", rec["employee_id"], rec["attendance_date"])
        self.load()

    def load_departments(self) -> None:
        cur = self.department.currentText()
        self.department.blockSignals(True)
        self.department.clear()
        self.department.addItem("")
        self.department.addItems(self.db.departments())
        self.department.setCurrentText(cur)
        self.department.blockSignals(False)

    def load(self) -> None:
        self.load_departments()
        self.records = self.db.attendance_report(
            self.start_date.date().toString("yyyy-MM-dd"),
            self.end_date.date().toString("yyyy-MM-dd"),
            self.department.currentText().strip(),
            self.name.text().strip(),
        )
        self.table.setRowCount(len(self.records))
        for row, rec in enumerate(self.records):
            sign_out = rec.get("sign_out") or ""
            status = "Signed Out" if sign_out else ("Present" if rec.get("sign_in") else "")
            for col, val in enumerate([
                display_date(rec.get("attendance_date", "")),
                rec.get("employee_id", ""),
                rec.get("full_name", ""),
                rec.get("gender", ""),
                rec.get("department", ""),
                rec.get("sign_in") or "",
                sign_out,
                calculate_hours(rec.get("sign_in"), rec.get("sign_out")),
                status,
            ]):
                self.table.setItem(row, col, QTableWidgetItem(str(val)))
        self.table.resizeColumnsToContents()
        n = len(self.records)
        self.record_count.setText(f"{n} record{'s' if n != 1 else ''}")

    def export(self, kind: str) -> None:
        if not self.records:
            QMessageBox.information(self, "No Records", "No records to export.")
            return
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        default = str(EXPORTS_DIR / f"attendance_{stamp}.{kind}")
        filters = {"csv": "CSV (*.csv)", "xlsx": "Excel (*.xlsx)", "pdf": "PDF (*.pdf)"}[kind]
        dest, _ = QFileDialog.getSaveFileName(self, "Save Export", default, filters)
        if not dest:
            return
        try:
            writer = {"csv": export_csv, "xlsx": export_excel, "pdf": export_pdf}[kind]
            path = writer(self.records, Path(dest))
            log.info("Exported %d records to %s", len(self.records), path)
            QMessageBox.information(self, "Export Complete", f"Saved to:\n{path}")
        except Exception:
            log.exception("Export failed (%s)", kind)
            QMessageBox.warning(
                self, "Export Failed",
                "Could not create the export file. See logs/app.log for details.",
            )


class SettingsPage(QWidget):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db

        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.addWidget(heading("Settings"))

        # Admin creds
        cp = panel()
        cl = QVBoxLayout(cp)
        cl.addWidget(section_label("Administrator Credentials"))
        cf = QFormLayout()
        cf.setSpacing(10)
        self.admin_username = QLineEdit(self.db.get_setting("admin_username", DEFAULT_ADMIN_USERNAME))
        self.admin_password = QLineEdit()
        self.admin_password.setEchoMode(QLineEdit.Password)
        self.admin_password.setPlaceholderText("Leave blank to keep the current password")
        cf.addRow("Username", self.admin_username)
        cf.addRow("New Password", self.admin_password)
        cl.addLayout(cf)
        layout.addWidget(cp)

        # Camera
        camp = panel()
        caml = QVBoxLayout(camp)
        caml.addWidget(section_label("Camera"))
        caml.addWidget(muted_label(
            "Which camera the scanner uses. Change this if the wrong camera opens."
        ))
        camf = QFormLayout()
        camf.setSpacing(10)
        self.camera_index = QComboBox()
        self.camera_index.addItems(["0", "1", "2", "3"])
        self.camera_index.setEditable(True)
        self.camera_index.setCurrentText(self.db.get_setting("camera_index", "0"))
        camf.addRow("Camera number", self.camera_index)
        caml.addLayout(camf)
        layout.addWidget(camp)

        btns = QHBoxLayout()
        save_btn = QPushButton("💾  Save Settings")
        save_btn.clicked.connect(self.save)
        btns.addWidget(save_btn)
        btns.addStretch()
        layout.addLayout(btns)
        layout.addStretch()

    def save(self, *, announce: bool = True) -> None:
        self.db.set_setting("admin_username", self.admin_username.text().strip() or DEFAULT_ADMIN_USERNAME)
        new_password = self.admin_password.text()
        if new_password:
            self.db.set_admin_password(new_password)
            self.admin_password.clear()
        camera = self.camera_index.currentText().strip()
        self.db.set_setting("camera_index", camera if camera.isdigit() else "0")
        if announce:
            QMessageBox.information(self, "Saved", "All settings have been saved.")


class DashboardPage(QWidget):
    def __init__(self, db: Database, navigate):
        super().__init__()
        self.db = db
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.addWidget(heading("Dashboard"))

        today = datetime.now().strftime("%Y-%m-%d")
        today_records = self.db.attendance_report(today, today)
        contractors = len(self.db.list_employees())
        present = len(today_records)
        signed_out = len([r for r in today_records if r.get("sign_out")])
        on_site = present - signed_out

        row = QHBoxLayout()
        row.setSpacing(14)
        row.addWidget(stat_card("Total Contractors", contractors, PINK,   "#FCE4EC"))
        row.addWidget(stat_card("Present Today",      present,     TEAL,   "#E0F2F1"))
        row.addWidget(stat_card("Currently On-Site",  on_site,     DARK,   "#EDE7F6"))
        row.addWidget(stat_card("Signed Out Today",   signed_out,  GOLD,   "#FFF8E1"))
        layout.addLayout(row)

        ap = panel()
        al = QVBoxLayout(ap)
        al.addWidget(section_label("Quick Actions"))
        ag = QGridLayout()
        ag.setSpacing(10)
        for i, (label, idx) in enumerate([
            ("✚  Register Contractor", 1),
            ("👷  Contractor List",    2),
            ("📋  View Attendance",    4),
            ("⚙  Settings",           5),
        ]):
            btn = QPushButton(label)
            btn.setMinimumHeight(48)
            btn.clicked.connect(lambda _=False, pg=idx: navigate(pg))
            ag.addWidget(btn, i // 2, i % 2)
        al.addLayout(ag)
        layout.addWidget(ap)
        layout.addStretch()


class MainWindow(QMainWindow):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.setWindowTitle(APP_NAME)
        self.resize(1200, 780)

        root = QWidget()
        self.setCentralWidget(root)
        rl = QHBoxLayout(root)
        rl.setContentsMargins(0, 0, 0, 0)
        rl.setSpacing(0)

        # ── Sidebar ───────────────────────────────────────────────────
        sidebar = QWidget()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(224)
        sb = QVBoxLayout(sidebar)
        sb.setContentsMargins(0, 0, 0, 0)
        sb.setSpacing(0)

        brand_box = QWidget()
        brand_box.setObjectName("sidebarBrandBox")
        bb = QHBoxLayout(brand_box)
        bb.setContentsMargins(16, 18, 16, 18)
        bb.setSpacing(10)
        txt_col = QVBoxLayout()
        txt_col.setSpacing(2)
        brand_name = QLabel("CONTRACTOR")
        brand_name.setObjectName("sidebarBrandName")
        brand_sub = QLabel("Attendance System")
        brand_sub.setObjectName("sidebarBrandSub")
        txt_col.addWidget(brand_name)
        txt_col.addWidget(brand_sub)
        bb.addLayout(txt_col)
        sb.addWidget(brand_box)

        self.nav = QListWidget()
        self.nav.setObjectName("sidebarNav")
        self.nav.addItems([
            "  📊  Dashboard",
            "  ✚  Register",
            "  👷  Contractor List",
            "  📷  QR Scanner",
            "  📋  Attendance",
            "  ⚙  Settings",
        ])
        self.nav.currentRowChanged.connect(self.stack_changed)
        sb.addWidget(self.nav, stretch=1)

        count = len(self.db.list_employees())
        footer = QLabel(f"{count} contractor{'s' if count != 1 else ''} registered")
        footer.setObjectName("sidebarFooter")
        footer.setAlignment(Qt.AlignCenter)
        sb.addWidget(footer)
        rl.addWidget(sidebar)

        # ── Content ───────────────────────────────────────────────────
        content = QWidget()
        content.setObjectName("mainContent")
        cl = QVBoxLayout(content)
        cl.setContentsMargins(22, 22, 22, 22)

        self.stack = QStackedWidget()
        self.dashboard    = DashboardPage(self.db, self.navigate)
        self.register     = RegisterPage(self.db)
        self.employee_list = EmployeeListPage(self.db)
        self.scanner      = ScannerPage(self.db)
        self.attendance   = AttendancePage(self.db)
        self.settings     = SettingsPage(self.db)
        for pg in [self.dashboard, self.register, self.employee_list,
                   self.scanner, self.attendance, self.settings]:
            self.stack.addWidget(pg)
        cl.addWidget(self.stack)
        rl.addWidget(content, stretch=1)
        self.nav.setCurrentRow(0)

    def navigate(self, index: int) -> None:
        self.nav.setCurrentRow(index)

    def stack_changed(self, index: int) -> None:
        if index != 3:
            self.scanner.stop_scanner()
        self.stack.setCurrentIndex(index)
        if index == 2:
            self.employee_list.load()
        if index == 4:
            self.attendance.load()
        if index == 0:
            self.stack.removeWidget(self.dashboard)
            self.dashboard.deleteLater()
            self.dashboard = DashboardPage(self.db, self.navigate)
            self.stack.insertWidget(0, self.dashboard)
            self.stack.setCurrentIndex(0)

    def closeEvent(self, event) -> None:
        self.scanner.shutdown()
        super().closeEvent(event)


class EmployeeWindow(QMainWindow):
    def __init__(self, db: Database):
        super().__init__()
        self.db = db
        self.setWindowTitle(APP_NAME)
        self.resize(1200, 780)

        self.stack = QStackedWidget()
        self.setCentralWidget(self.stack)

        # ── Scanner page ──────────────────────────────────────────────
        sp = QWidget()
        spl = QVBoxLayout(sp)
        spl.setContentsMargins(0, 0, 0, 0)
        spl.setSpacing(0)

        hdr = QWidget()
        hdr.setObjectName("headerBar")
        hdrl = QHBoxLayout(hdr)
        hdrl.setContentsMargins(22, 14, 22, 14)
        hdrl.setSpacing(12)

        titles = QVBoxLayout()
        titles.setSpacing(2)
        brand = QLabel("CONTRACTOR ATTENDANCE SYSTEM")
        brand.setObjectName("headerBrand")
        sub = QLabel("Scan your QR code to sign in or sign out")
        sub.setObjectName("headerSub")
        titles.addWidget(brand)
        titles.addWidget(sub)
        hdrl.addLayout(titles)
        hdrl.addStretch()

        self.admin_button = QPushButton("Admin Login")
        self.admin_button.setObjectName("headerButton")
        self.admin_button.clicked.connect(self.open_admin)
        hdrl.addWidget(self.admin_button)
        spl.addWidget(hdr)

        self.scanner = ScannerPage(self.db, auto_start=True)
        wrap = QWidget()
        wrap.setObjectName("mainContent")
        wl = QVBoxLayout(wrap)
        wl.setContentsMargins(22, 22, 22, 22)
        wl.addWidget(self.scanner)
        spl.addWidget(wrap, stretch=1)
        self.stack.addWidget(sp)

        # ── Admin page ────────────────────────────────────────────────
        ap = QWidget()
        apl = QVBoxLayout(ap)
        apl.setContentsMargins(0, 0, 0, 0)
        apl.setSpacing(0)

        ahdr = QWidget()
        ahdr.setObjectName("headerBar")
        ahdrl = QHBoxLayout(ahdr)
        ahdrl.setContentsMargins(22, 14, 22, 14)
        admin_title = QLabel("Admin Dashboard")
        admin_title.setObjectName("headerBrand")
        ahdrl.addWidget(admin_title)
        ahdrl.addStretch()
        self.back_button = QPushButton("← Back to Scanner")
        self.back_button.setObjectName("headerButton")
        self.back_button.clicked.connect(self.show_employee_page)
        ahdrl.addWidget(self.back_button)
        apl.addWidget(ahdr)

        self.admin_window = MainWindow(self.db)
        self.admin_window.setWindowFlags(Qt.Widget)
        apl.addWidget(self.admin_window, stretch=1)
        self.stack.addWidget(ap)

    def open_admin(self) -> None:
        dlg = LoginDialog(self.db)
        if dlg.exec() != QDialog.Accepted:
            return
        self.scanner.shutdown()          # free the camera for the admin view
        self.setWindowTitle(f"{APP_NAME} – Admin")
        self.stack.setCurrentIndex(1)

    def show_employee_page(self) -> None:
        self.admin_window.scanner.shutdown()
        self.setWindowTitle(APP_NAME)
        self.stack.setCurrentIndex(0)
        self.scanner.start_scanner()     # resume the kiosk scanner

    def closeEvent(self, event) -> None:
        self.scanner.shutdown()
        self.admin_window.scanner.shutdown()
        super().closeEvent(event)


# ── Helpers ───────────────────────────────────────────────────────────────────

def panel() -> QFrame:
    f = QFrame(); f.setObjectName("panel"); return f

def heading(text: str) -> QLabel:
    l = QLabel(text); l.setObjectName("heading"); return l

def muted_label(text: str) -> QLabel:
    l = QLabel(text); l.setObjectName("muted"); l.setWordWrap(True); return l

def section_label(text: str) -> QLabel:
    l = QLabel(text); l.setObjectName("sectionLabel"); return l

def stat_card(label: str, value: int, color: str, bg: str) -> QFrame:
    card = QFrame()
    lo = QVBoxLayout(card)
    lo.setContentsMargins(20, 16, 20, 16)
    num = QLabel(str(value))
    num.setStyleSheet(f"font-size:40px;font-weight:800;color:{color};background:transparent;")
    lbl = QLabel(label)
    lbl.setStyleSheet(f"font-size:13px;color:{MUTED};font-weight:500;background:transparent;")
    lo.addWidget(num); lo.addWidget(lbl)
    card.setStyleSheet(
        f"QFrame{{background:{bg};border:1px solid {color}44;border-radius:14px;}}"
    )
    return card


# ── Stylesheet ────────────────────────────────────────────────────────────────

def apply_style(app: QApplication) -> None:
    app.setStyleSheet(f"""
        QWidget {{
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 13px;
            color: {TEXT};
            background: {BG};
        }}

        /* ── Sidebar ── */
        #sidebar {{ background: {DARK}; }}
        #sidebarBrandBox {{ background: {DARK}; border-bottom: 1px solid #2D2550; }}
        #sidebarBrandName {{
            color: #FFFFFF; font-size: 14px; font-weight: 800;
            letter-spacing: 2px; background: transparent;
        }}
        #sidebarBrandSub {{
            color: #7C6FA0; font-size: 11px; background: transparent;
        }}
        #sidebarNav {{
            background: {DARK}; color: #8B7DB5;
            border: none; padding: 8px; font-size: 13px; outline: none;
        }}
        QListWidget#sidebarNav::item {{
            padding: 11px 14px; border-radius: 8px; margin: 2px 0; font-weight: 500;
        }}
        QListWidget#sidebarNav::item:hover {{
            background: #2D2550; color: #E0D9F5;
        }}
        QListWidget#sidebarNav::item:selected {{
            background: {PINK}; color: white; font-weight: 600;
        }}
        #sidebarFooter {{
            background: {DARK}; color: #4A3F6B;
            font-size: 11px; padding: 10px;
        }}

        /* ── Header bar ── */
        #headerBar {{ background: {DARK}; }}
        #headerBrand {{
            color: #FFFFFF; font-size: 15px; font-weight: 700;
            letter-spacing: 1px; background: transparent;
        }}
        #headerSub {{ color: #7C6FA0; font-size: 12px; background: transparent; }}
        QPushButton#headerButton {{
            background: transparent; color: #B0A3D4;
            border: 1.5px solid #3D3462; border-radius: 8px; padding: 8px 16px;
        }}
        QPushButton#headerButton:hover {{
            background: #2D2550; color: #FFFFFF; border-color: #6B5EA8;
        }}

        /* ── Content ── */
        #mainContent {{ background: {BG}; }}

        /* ── Buttons ── */
        QPushButton {{
            background: {PINK}; color: white; border: none;
            border-radius: 8px; padding: 9px 18px; font-weight: 600; font-size: 13px;
        }}
        QPushButton:hover {{ background: {PINK_D}; }}
        QPushButton:pressed {{ background: #8C1244; }}
        QPushButton:disabled {{ background: #CBD5E1; color: #94A3B8; }}

        QPushButton#dangerButton {{ background: #DC2626; }}
        QPushButton#dangerButton:hover {{ background: #B91C1C; }}

        QPushButton#secondaryButton {{
            background: transparent; color: {PINK}; border: 1.5px solid {PINK};
        }}
        QPushButton#secondaryButton:hover {{ background: #FCE4EC; }}
        QPushButton#secondaryButton:disabled {{
            background: transparent; color: #CBD5E1; border-color: #CBD5E1;
        }}

        /* ── Inputs ── */
        QLineEdit, QComboBox, QDateEdit {{
            background: white; border: 1.5px solid {BORDER};
            border-radius: 8px; padding: 8px 12px; font-size: 13px;
        }}
        QLineEdit:focus, QDateEdit:focus {{ border-color: {PINK}; }}
        QLineEdit:read-only {{ background: {BG}; color: {MUTED}; }}
        QComboBox::drop-down {{ border: none; padding-right: 8px; }}

        /* ── Tables ── */
        QTableWidget {{
            background: white; border: 1px solid {BORDER}; border-radius: 8px;
            gridline-color: #F5F6FA; selection-background-color: {PINK};
            selection-color: white; alternate-background-color: #FDF9FB;
        }}
        QTableWidget::item {{ padding: 8px 10px; border: none; }}
        QTableWidget::item:selected {{ background: {PINK}; color: white; }}
        QHeaderView::section {{
            background: #F8F4F9; border: none; border-bottom: 2px solid {BORDER};
            padding: 9px 10px; font-weight: 700; font-size: 11px;
            color: #7C3A68; letter-spacing: 0.5px;
        }}
        QScrollBar:vertical {{
            background: {BG}; width: 8px; border-radius: 4px; margin: 0;
        }}
        QScrollBar::handle:vertical {{ background: #D5C8E8; border-radius: 4px; }}
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}

        /* ── Cards ── */
        #panel {{
            background: {CARD}; border: 1px solid {BORDER};
            border-radius: 12px; padding: 16px;
        }}
        #statusPanel {{
            background: {CARD}; border: 1px solid {BORDER};
            border-radius: 12px; padding: 16px;
        }}

        /* ── Typography ── */
        #heading {{
            font-size: 20px; font-weight: 700; color: #1A1033;
            background: transparent; padding: 0 0 12px 0;
        }}
        #sectionLabel {{
            font-size: 11px; font-weight: 700; color: #7C3A68;
            background: transparent; padding: 0 0 8px 0; letter-spacing: 0.8px;
        }}
        #title {{
            font-size: 20px; font-weight: 700; color: #1A1033; background: transparent;
        }}
        #muted {{ color: {MUTED}; font-size: 13px; background: transparent; }}

        /* ── Camera / QR ── */
        #cameraPreview {{
            background: {DARK}; color: #4A3F6B;
            border-radius: 10px; font-size: 14px;
        }}
        #qrPreview {{
            background: #FDF5FF; border-radius: 10px;
            border: 2px dashed #D5C8E8;
        }}

        /* ── Scanner status ── */
        #statusTitle  {{ font-size: 26px; font-weight: 800; background: transparent; }}
        #statusDetail {{ font-size: 14px; color: #374151; background: transparent; }}
        #syncStatus   {{ font-size: 12px; color: {MUTED}; background: transparent; }}
        #liveClock    {{
            font-size: 30px; font-weight: 300; color: #1A1033;
            background: transparent; letter-spacing: 2px;
        }}
        #liveDate {{ font-size: 12px; color: {MUTED}; background: transparent; }}
        #divider  {{ color: {BORDER}; background: {BORDER}; max-height: 1px; }}
    """)


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> int:
    ensure_directories()
    log = setup_logging()
    db = Database()
    app = QApplication(sys.argv)
    apply_style(app)

    def _excepthook(exc_type, exc, tb):
        log.critical("Unhandled exception", exc_info=(exc_type, exc, tb))
        sys.__excepthook__(exc_type, exc, tb)

    sys.excepthook = _excepthook

    window = EmployeeWindow(db)
    window.show()
    log.info("Application ready")
    exit_code = app.exec()
    log.info("Application closed (exit %s)", exit_code)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
