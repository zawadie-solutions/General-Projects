from pathlib import Path
from typing import Any

from database import Database
from qr_generator import generate_employee_qr


class EmployeeService:
    def __init__(self, db: Database):
        self.db = db

    def register(self, full_name: str, gender: str, department: str, position: str) -> dict[str, Any]:
        employee_id = self.db.next_employee_id()
        qr_path = str(generate_employee_qr(employee_id))
        return self.db.add_employee(
            full_name=full_name,
            gender=gender,
            department=department,
            position=position,
            qr_path=qr_path,
            employee_id=employee_id,
        )

    def regenerate_qr(self, employee_id: str) -> Path:
        path = generate_employee_qr(employee_id)
        self.db.update_employee_qr_path(employee_id, str(path))
        return path
