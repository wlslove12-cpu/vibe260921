"""네이버 뉴스 크롤러 (PyQt6 GUI)

실행:
    python news_crawler_gui.py

크롤링 로직은 news_crawler.py를 그대로 사용하고, 이 파일은 화면만 담당한다.
수집은 백그라운드 스레드에서 실행되므로 수집 중에도 창이 멈추지 않는다.
"""
import html
import sys
from pathlib import Path

from PyQt6.QtCore import Qt, QThread, QUrl, pyqtSignal
from PyQt6.QtGui import QDesktopServices
from PyQt6.QtWidgets import (
    QAbstractItemView, QApplication, QCheckBox, QFileDialog, QGroupBox, QHBoxLayout, QHeaderView,
    QLabel, QLineEdit, QMainWindow, QMessageBox, QPlainTextEdit, QProgressBar, QPushButton,
    QSpinBox, QSplitter, QTableWidget, QTableWidgetItem, QTextBrowser, QVBoxLayout, QWidget,
)

import news_crawler as nc

COLUMNS = ["순위", "구분", "언론사", "제목", "게시", "본문"]
CENTERED = {0, 1, 4, 5}  # 가운데 정렬할 열


class CrawlWorker(QThread):
    """news_crawler.crawl()을 별도 스레드에서 실행하고 진행 상황을 시그널로 알린다."""
    # 주의: pyqtSignal(list)/(dict)로 선언하면 PyQt가 값을 '복사'해서 넘긴다.
    # 워커 스레드가 나중에 채우는 본문이 화면에 반영되도록, 항목을 완성한 시점의 복사본을 직접 전달한다.
    log = pyqtSignal(str)
    list_ready = pyqtSignal(object)      # 목록 파싱 직후 (본문은 아직 비어 있음)
    item_done = pyqtSignal(int, object)  # 항목 하나 처리 완료 (인덱스, 완성된 항목)
    failed = pyqtSignal(str)

    def __init__(self, url, limit, with_content):
        super().__init__()
        self.url, self.limit, self.with_content = url, limit, with_content
        self.cancelled = False

    def cancel(self):
        self.cancelled = True

    def run(self):
        try:
            nc.crawl(
                self.url, self.limit, self.with_content,
                log=lambda text: self.log.emit(text.rstrip()),
                on_list=lambda items: self.list_ready.emit([dict(it) for it in items]),
                on_item=lambda i, item: self.item_done.emit(i, dict(item)),
                should_stop=lambda: self.cancelled,
            )
        except Exception as e:  # 네트워크 오류 등을 화면에 알리기 위해 스레드 밖으로 전달한다
            self.failed.emit(f"{type(e).__name__}: {e}")


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("네이버 뉴스 크롤러")
        self.resize(1080, 780)
        self.items = []
        self.worker = None
        self.with_content = True
        self.build_ui()

    # ---------- 화면 구성 ----------

    def build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        # 검색 설정
        box = QGroupBox("검색 설정")
        box_layout = QVBoxLayout(box)

        url_row = QHBoxLayout()
        url_row.addWidget(QLabel("검색 결과 URL"))
        self.url_edit = QLineEdit(nc.SEARCH_URL)
        self.url_edit.setCursorPosition(0)
        self.url_edit.setClearButtonEnabled(True)
        self.url_edit.returnPressed.connect(self.start)
        url_row.addWidget(self.url_edit, 1)
        box_layout.addLayout(url_row)

        option_row = QHBoxLayout()
        option_row.addWidget(QLabel("기사 수"))
        self.spin = QSpinBox()
        self.spin.setRange(1, 30)
        self.spin.setValue(10)
        option_row.addWidget(self.spin)
        self.content_check = QCheckBox("본문까지 수집 (끄면 목록만, 훨씬 빠름)")
        self.content_check.setChecked(True)
        option_row.addWidget(self.content_check)
        option_row.addStretch(1)
        self.start_btn = QPushButton("수집 시작")
        self.start_btn.setDefault(True)
        self.start_btn.clicked.connect(self.start)
        self.stop_btn = QPushButton("중지")
        self.stop_btn.setEnabled(False)
        self.stop_btn.clicked.connect(self.stop)
        self.excel_btn = QPushButton("엑셀로 저장")
        self.excel_btn.setEnabled(False)
        self.excel_btn.clicked.connect(self.save_excel)
        self.save_btn = QPushButton("JSON/CSV 저장…")
        self.save_btn.setEnabled(False)
        self.save_btn.clicked.connect(self.save)
        for b in (self.start_btn, self.stop_btn, self.excel_btn, self.save_btn):
            option_row.addWidget(b)
        box_layout.addLayout(option_row)
        layout.addWidget(box)

        # 결과 표 + 상세
        splitter = QSplitter(Qt.Orientation.Vertical)
        self.table = QTableWidget(0, len(COLUMNS))
        self.table.setHorizontalHeaderLabels(COLUMNS)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.table.setAlternatingRowColors(True)
        self.table.verticalHeader().setVisible(False)
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(COLUMNS.index("제목"), QHeaderView.ResizeMode.Stretch)
        self.table.itemSelectionChanged.connect(self.show_detail)
        self.table.cellDoubleClicked.connect(self.open_original)
        splitter.addWidget(self.table)

        self.detail = QTextBrowser()
        self.detail.setOpenExternalLinks(True)
        self.detail.setPlaceholderText("표에서 기사를 선택하면 내용이 여기에 표시됩니다. (더블클릭하면 원문을 브라우저로 엽니다)")
        splitter.addWidget(self.detail)
        splitter.setSizes([300, 320])
        layout.addWidget(splitter, 1)

        # 진행 상태 + 로그
        status_row = QHBoxLayout()
        self.progress = QProgressBar()
        self.progress.setTextVisible(True)
        self.progress.setFormat("%v / %m")
        self.progress.setValue(0)
        self.status = QLabel("URL을 확인하고 [수집 시작]을 누르세요.")
        status_row.addWidget(self.progress, 1)
        status_row.addWidget(self.status, 2)
        layout.addLayout(status_row)

        self.log_view = QPlainTextEdit()
        self.log_view.setReadOnly(True)
        self.log_view.setMaximumHeight(100)
        self.log_view.setPlaceholderText("진행 로그")
        layout.addWidget(self.log_view)

    # ---------- 수집 제어 ----------

    def start(self):
        if self.worker and self.worker.isRunning():
            return
        url = self.url_edit.text().strip()
        if not url.lower().startswith(("http://", "https://")):
            QMessageBox.warning(self, "URL 확인", "http:// 또는 https:// 로 시작하는 네이버 검색 결과 URL을 입력하세요.")
            return

        self.items = []
        self.table.setRowCount(0)
        self.detail.clear()
        self.log_view.clear()
        self.with_content = self.content_check.isChecked()
        self.progress.setRange(0, 0)  # 목록을 받는 동안은 진행 표시줄을 '대기 중' 상태로 둔다
        self.status.setText("검색 결과를 불러오는 중…")
        self.set_running(True)

        self.worker = CrawlWorker(url, self.spin.value(), self.with_content)
        self.worker.log.connect(self.log_view.appendPlainText)
        self.worker.list_ready.connect(self.on_list)
        self.worker.item_done.connect(self.on_item_done)
        self.worker.failed.connect(self.on_failed)
        self.worker.finished.connect(self.on_finished)
        self.worker.start()

    def stop(self):
        if self.worker and self.worker.isRunning():
            self.worker.cancel()
            self.stop_btn.setEnabled(False)
            self.status.setText("중지하는 중… (진행 중인 요청이 끝나면 멈춥니다)")

    def set_running(self, running):
        for w in (self.url_edit, self.spin, self.content_check, self.start_btn):
            w.setEnabled(not running)
        self.stop_btn.setEnabled(running)
        can_save = not running and bool(self.items)
        self.excel_btn.setEnabled(can_save)
        self.save_btn.setEnabled(can_save)

    # ---------- 워커 시그널 처리 ----------

    def on_list(self, items):
        self.items = items
        self.table.setRowCount(len(items))
        for row in range(len(items)):
            self.update_row(row)
        self.progress.setRange(0, max(len(items), 1))
        self.progress.setValue(0)
        self.status.setText(f"{len(items)}개 기사를 찾았습니다." + (" 본문을 수집하는 중…" if self.with_content else ""))
        if items:
            self.table.selectRow(0)

    def on_item_done(self, index, item):
        self.items[index] = item
        self.update_row(index, done=True)
        self.progress.setValue(index + 1)
        if self.table.currentRow() == index:
            self.show_detail()

    def on_failed(self, message):
        self.log_view.appendPlainText(f"오류: {message}")
        QMessageBox.warning(self, "수집 오류", f"수집 중 오류가 발생했습니다.\n\n{message}")

    def on_finished(self):
        self.set_running(False)
        n = len(self.items)
        if self.worker.cancelled:
            self.status.setText(f"중지됨 ({self.progress.value()}/{n}개 처리)")
        elif not n:
            self.status.setText("수집된 기사가 없습니다. URL 또는 검색 결과의 태그 구조를 확인하세요.")
        else:
            self.progress.setValue(n)
            self.status.setText(f"완료: 기사 {n}개")

    # ---------- 표 / 상세 ----------

    def update_row(self, row, done=False):
        item = self.items[row]
        if not self.with_content:
            content_text = "-"
        elif item["content"]:
            content_text = f"{len(item['content'])}자"
        else:
            content_text = "없음" if done else "대기"  # 처리가 끝났는데 비어 있으면 수집 실패
        values = [item["rank"], item["type"], item["press"], item["title"],
                  item["published"][:16] or item["list_time"], content_text]
        for col, value in enumerate(values):
            cell = QTableWidgetItem(str(value))
            if col in CENTERED:
                cell.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.table.setItem(row, col, cell)

    def show_detail(self):
        row = self.table.currentRow()
        if not 0 <= row < len(self.items):
            self.detail.clear()
            return
        it = self.items[row]
        e = html.escape
        links = []
        if it["original_url"]:
            links.append(f'<a href="{e(it["original_url"])}">원문 보기</a>')
        if it["naver_url"]:
            links.append(f'<a href="{e(it["naver_url"])}">네이버뉴스</a>')

        parts = [
            f"<h3>{e(it['title'])}</h3>",
            f"<p style='color:gray'>{e(it['press'])} · {e(it['published'] or it['list_time'])} · {e(it['type'])} 기사</p>",
        ]
        if links:
            parts.append(f"<p>{' · '.join(links)}</p>")
        if it["snippet"]:
            parts.append(f"<p><b>목록 요약</b><br>{e(it['snippet'])}</p>")
        if it["content"]:
            parts.append("<hr><p><b>본문</b></p>" + "".join(f"<p>{e(p)}</p>" for p in it["content"].split("\n")))
        else:
            parts.append("<p style='color:gray'>본문을 가져오지 못했거나 수집하지 않았습니다.</p>")
        self.detail.setHtml("".join(parts))

    def open_original(self, row, _column):
        if 0 <= row < len(self.items) and self.items[row]["original_url"]:
            QDesktopServices.openUrl(QUrl(self.items[row]["original_url"]))

    # ---------- 저장 ----------

    def save_excel(self):
        self.save_as("news_articles.xlsx", "Excel (*.xlsx)")

    def save(self):
        self.save_as("news_articles.json", "JSON (*.json);;CSV (*.csv)")

    def save_as(self, default_name, filters):
        if not self.items:
            return
        path, selected = QFileDialog.getSaveFileName(self, "결과 저장", default_name, filters)
        if not path:
            return
        if not Path(path).suffix:  # 확장자를 안 쓴 경우 선택한 형식을 따른다
            path += {"E": ".xlsx", "C": ".csv"}.get(selected[:1], ".json")
        writers = {".xlsx": nc.save_xlsx, ".csv": nc.save_csv}
        try:
            writers.get(Path(path).suffix.lower(), nc.save_json)(self.items, path)
        except ImportError:
            QMessageBox.warning(self, "엑셀 저장 불가", "엑셀 저장에는 openpyxl이 필요합니다.\n\npip install openpyxl")
            return
        except OSError as e:  # 같은 이름의 파일을 엑셀에서 열어 둔 경우 등
            QMessageBox.warning(self, "저장 실패", str(e))
            return
        self.status.setText(f"저장 완료: {path}")

    def closeEvent(self, event):
        if self.worker and self.worker.isRunning():
            self.worker.cancel()
            self.worker.wait(15000)  # 진행 중인 요청(최대 10초)이 끝나기를 기다린다
        super().closeEvent(event)


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
