from __future__ import annotations

import sys
import time

from PySide6.QtCore import QObject, QThread, Signal
from PySide6.QtGui import QImage


class QRScannerWorker(QObject):
    frame_ready = Signal(QImage)
    qr_detected = Signal(str)
    error = Signal(str)
    info = Signal(str)
    finished = Signal()

    # Decode every Nth frame only — QR codes don't move fast and full-rate
    # decoding pins a CPU core for no benefit.
    DECODE_EVERY = 2
    # How many times to try (re)opening the camera before giving up.
    OPEN_ATTEMPTS = 5

    def __init__(self, camera_index: int = 0):
        super().__init__()
        self.camera_index = camera_index
        self._running = True
        self._capture = None

    def stop(self) -> None:
        self._running = False

    # ── Camera helpers ───────────────────────────────────────────────

    def _open_capture(self, cv2):
        """Open the camera, retrying a few times. Returns a capture or None."""
        # CAP_DSHOW opens far faster than the default MSMF backend on Windows
        # and avoids its noisy warnings.
        backend = cv2.CAP_DSHOW if sys.platform.startswith("win") else 0
        for attempt in range(1, self.OPEN_ATTEMPTS + 1):
            if not self._running:
                return None
            capture = cv2.VideoCapture(self.camera_index, backend)
            if capture.isOpened():
                return capture
            capture.release()
            if attempt < self.OPEN_ATTEMPTS:
                self.info.emit(f"Waiting for camera… (attempt {attempt})")
                self._interruptible_sleep(1.0)
        return None

    def _interruptible_sleep(self, seconds: float) -> None:
        """Sleep in small slices so stop() is acted on promptly."""
        deadline = time.monotonic() + seconds
        while self._running and time.monotonic() < deadline:
            time.sleep(0.05)

    # ── Main loop ────────────────────────────────────────────────────

    def run(self) -> None:
        try:
            import cv2
        except Exception as exc:
            self.error.emit(f"OpenCV is required for camera scanning. {exc}")
            self.finished.emit()
            return

        try:
            from pyzbar.pyzbar import decode as pyzbar_decode
        except Exception:
            pyzbar_decode = None

        qr_detector = cv2.QRCodeDetector()

        capture = self._open_capture(cv2)
        if capture is None:
            self.error.emit("Camera not found. Check that it is connected and not in use.")
            self.finished.emit()
            return
        self._capture = capture
        self.info.emit("")

        frame_number = 0
        read_failures = 0
        try:
            while self._running:
                ok, frame = capture.read()
                if not ok:
                    read_failures += 1
                    if read_failures <= 1:
                        self.info.emit("Camera hiccup — reconnecting…")
                    self._interruptible_sleep(0.3)
                    if read_failures >= 10:
                        capture.release()
                        capture = self._open_capture(cv2)
                        if capture is None:
                            self.error.emit("Lost the camera and could not reconnect.")
                            break
                        self._capture = capture
                        read_failures = 0
                        self.info.emit("")
                    continue
                read_failures = 0

                frame_number += 1
                if frame_number % self.DECODE_EVERY == 0:
                    value = self._decode_frame(cv2, frame, pyzbar_decode, qr_detector)
                    if value:
                        self.qr_detected.emit(value)

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                height, width, channels = rgb.shape
                bytes_per_line = channels * width
                image = QImage(rgb.data, width, height, bytes_per_line, QImage.Format_RGB888).copy()
                self.frame_ready.emit(image)
        finally:
            if capture is not None:
                capture.release()
            self._capture = None
            self.finished.emit()

    def _decode_frame(self, cv2, frame, pyzbar_decode, qr_detector) -> str:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if pyzbar_decode:
            decoded_values = pyzbar_decode(gray)
            if decoded_values:
                return decoded_values[0].data.decode("utf-8").strip()

        value, _points, _straight_qrcode = qr_detector.detectAndDecode(gray)
        return value.strip() if value else ""


class ScannerThread:
    def __init__(self, camera_index: int = 0):
        self.thread = QThread()
        self.worker = QRScannerWorker(camera_index)
        self.worker.moveToThread(self.thread)
        self.thread.started.connect(self.worker.run)
        self.worker.finished.connect(self.thread.quit)
        self.worker.finished.connect(self.worker.deleteLater)
        self.thread.finished.connect(self.thread.deleteLater)

    def start(self) -> None:
        self.thread.start()

    def stop(self) -> None:
        self.worker.stop()

    def wait(self, timeout_ms: int = 3000) -> None:
        """Block until the capture loop has fully exited — call on shutdown.

        quit() is invoked directly here (not only via the queued finished
        signal) so this works even after the main event loop has stopped.
        """
        try:
            self.worker.stop()
            self.thread.quit()
            self.thread.wait(timeout_ms)
        except RuntimeError:
            pass  # thread already deleted
