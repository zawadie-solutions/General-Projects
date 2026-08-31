from pathlib import Path

import qrcode

from settings import QR_CODES_DIR, ensure_directories


def generate_employee_qr(employee_id: str, output_dir: Path = QR_CODES_DIR) -> Path:
    ensure_directories()
    output_dir.mkdir(exist_ok=True)
    output_path = output_dir / f"{employee_id}.png"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
    )
    qr.add_data(employee_id)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    image.save(output_path)
    return output_path
