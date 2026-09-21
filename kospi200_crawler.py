"""코스피200 지수 데이터 크롤러 (네이버 증권)

https://stock.naver.com/market/stock/kr 는 자바스크립트(Next.js)로 화면을 그리는 페이지다.
requests로 받은 HTML에는 코스피200 값이 없고(지수 카드 자체가 없다), 브라우저가 나중에 API를 호출해서 채운다.
BeautifulSoup은 '받은 HTML'만 읽을 수 있으므로 이 HTML만으로는 값을 얻을 수 없다. 그래서 두 가지를 제공한다.

  1) 기본        : 페이지가 화면을 그릴 때 호출하는 JSON API에서 직접 가져온다. 빠르고 안정적이며 브라우저가 필요 없다.
  2) --render    : 실제 브라우저(Edge/Chrome, headless)로 위 URL을 렌더링한 뒤, 완성된 HTML을 BeautifulSoup으로 파싱한다.
                   화면에 보이는 값만 얻을 수 있고(현재가, 전일대비, 등락률, 52주 최고) 브라우저 설치가 필요하다.

수집하는 데이터:
    현재 지수  - 현재가, 전일대비, 등락률, 전일 종가, 시가, 고가, 저가, 52주 최고/최저, 거래량, 거래대금, 장 상태, 기준 시각
    일별 시세  - 날짜별 종가, 전일대비, 등락률, 시가, 고가, 저가 (최신순)

사용법:
    python kospi200_crawler.py                    # 현재 지수 + 최근 20거래일
    python kospi200_crawler.py -d 120 -o result   # 최근 120거래일, result.json / result_history.csv 로 저장
    python kospi200_crawler.py -d 0               # 현재 지수만
    python kospi200_crawler.py --render           # 현재 지수를 브라우저 렌더링 + BeautifulSoup으로 읽기

주의: 개인 학습용의 소량 수집을 전제로 했다. 페이지 요청 사이의 지연(DELAY)을 줄이지 말고,
      수집한 데이터를 재배포하기 전에는 네이버 증권의 이용 약관을 확인한다.
"""
import argparse
import csv
import json
import re
import shutil
import subprocess
import sys
import time

import requests
from bs4 import BeautifulSoup

PAGE_URL = "https://stock.naver.com/market/stock/kr"
INDICATOR_API = "https://stock.naver.com/api/securityService/integration/indicators"
REALTIME_API = "https://polling.finance.naver.com/api/realtime/domestic/index/KPI200"
HISTORY_API = "https://stock.naver.com/api/securityFe/api/index/KPI200/price"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://stock.naver.com/domestic/index/KPI200/price",
}
TIMEOUT = 10      # 초
DELAY = 0.3       # 페이지 사이의 대기 시간(초)
PAGE_SIZE = 50    # 일별 시세 API는 한 번에 50개까지만 허용한다 (100 이상이면 400 오류)

DOWN_TYPES = ("FALLING", "LOWER_LIMIT", "하락")  # 이 값이면 전일대비에 음수 부호를 붙인다


def to_float(text):
    """'1,112.16' -> 1112.16. 비어 있거나 숫자가 아니면 None."""
    try:
        return float(str(text).replace(",", ""))
    except ValueError:
        return None


def signed(value, direction):
    """API는 하락일 때도 변동폭을 양수로 주는 경우가 있어서, 방향에 맞게 부호를 맞춘다."""
    if value is None:
        return None
    return -abs(value) if direction in DOWN_TYPES else abs(value)


# ---------- 1. JSON API 방식 (기본) ----------

def parse_indicator(d):
    """indicators API 응답 항목 하나를 정리된 dict로 바꾼다."""
    direction = d.get("fluctuationsType")
    return {
        "name": d["stockName"],
        "price": to_float(d["currentPrice"]),
        "change": signed(to_float(d["fluctuations"]), direction),
        "change_rate": signed(to_float(d["fluctuationsRatio"]), direction),
        "prev_close": to_float(d.get("lastClosePrice")),
        "open": to_float(d.get("openPrice")),
        "high": to_float(d.get("highPrice")),
        "low": to_float(d.get("lowPrice")),
        "high_52w": to_float(d.get("highPriceOf52Weeks")),
        "low_52w": to_float(d.get("lowPriceOf52Weeks")),
        "volume": None,       # 아래 실시간 API에서 채운다
        "trade_value": None,
        "status": d.get("marketStatus"),
        "time": d.get("localTradedAt"),
        "source": "api",
    }


def fetch_snapshot(session):
    resp = session.get(INDICATOR_API, params={"indicatorCodes": "KPI200"}, timeout=TIMEOUT)
    resp.raise_for_status()
    snapshot = parse_indicator(resp.json()[0])

    # 거래량/거래대금은 실시간 API에만 있다. 실패해도 나머지 값은 그대로 쓴다.
    try:
        resp = session.get(REALTIME_API, timeout=TIMEOUT)
        resp.raise_for_status()
        rt = resp.json()["datas"][0]
        snapshot["volume"] = to_float(rt.get("accumulatedTradingVolumeRaw"))        # 주
        snapshot["trade_value"] = to_float(rt.get("accumulatedTradingValueRaw"))    # 원
    except (requests.RequestException, KeyError, IndexError, ValueError):
        pass
    return snapshot


def fetch_history(session, days):
    """일별 시세를 최신순으로 days개 가져온다. (한 번에 50개씩 페이지를 넘긴다)"""
    rows, page = [], 1
    while len(rows) < days:
        resp = session.get(HISTORY_API, params={"page": page, "pageSize": PAGE_SIZE}, timeout=TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            break
        rows.extend(data)
        if len(data) < PAGE_SIZE:
            break
        page += 1
        time.sleep(DELAY)

    return [{
        "date": r["localTradedAt"],
        "close": to_float(r["closePrice"]),
        "change": to_float(r["compareToPreviousClosePrice"]),  # 하락이면 이미 음수로 온다
        "change_rate": to_float(r["fluctuationsRatio"]),
        "open": to_float(r["openPrice"]),
        "high": to_float(r["highPrice"]),
        "low": to_float(r["lowPrice"]),
    } for r in rows[:days]]


# ---------- 2. 브라우저 렌더링 + BeautifulSoup 방식 (--render) ----------

BROWSER_NAMES = ("msedge", "chrome", "google-chrome", "chromium", "chromium-browser")
BROWSER_PATHS = (
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
)


def find_browser():
    for name in BROWSER_NAMES:
        path = shutil.which(name)
        if path:
            return path
    for path in BROWSER_PATHS:
        if shutil.which(path):  # 존재하고 실행 가능한 파일이면 경로가 그대로 돌아온다
            return path
    return None


def render_page(url, browser):
    """headless 브라우저로 페이지를 렌더링하고, 자바스크립트가 끝난 뒤의 HTML을 돌려준다."""
    cmd = [browser, "--headless=new", "--disable-gpu", "--virtual-time-budget=15000", "--dump-dom", url]
    result = subprocess.run(cmd, capture_output=True, timeout=120)
    html = result.stdout.decode("utf-8", errors="replace")
    if not html.strip():
        raise RuntimeError("브라우저가 페이지를 렌더링하지 못했습니다.")
    return html


# 예: "코스피 200 1,112.16 가격이 업데이트되었습니다 상승 21.93 (+2.01%) 52주 최고 1,518.11"
CARD_PATTERN = re.compile(
    r"(?P<price>[\d,]+\.\d+)\s+가격이 업데이트되었습니다\s+(?P<dir>상승|하락|보합)\s+"
    r"(?P<change>[\d,]+\.\d+)\s+\((?P<rate>[+-]?[\d.]+)%\)(?:\s+52주 최고\s+(?P<high52>[\d,]+\.\d+))?"
)


def parse_card(html):
    """렌더링된 HTML에서 '코스피 200' 지수 카드를 BeautifulSoup으로 찾아 값을 읽는다."""
    soup = BeautifulSoup(html, "html.parser")
    # 지수 카드는 상세 페이지로 가는 링크(<a href=".../index/KPI200/price">)다. 코스피200 선물은 /index/FUT/price.
    for card in soup.select('a[href$="/index/KPI200/price"]'):
        text = " ".join(card.get_text(" ", strip=True).split())
        m = CARD_PATTERN.search(text)
        if not m:
            continue
        direction = m["dir"]
        return {
            "name": "코스피 200",
            "price": to_float(m["price"]),
            "change": signed(to_float(m["change"]), direction),
            "change_rate": signed(to_float(m["rate"]), direction),
            "prev_close": None, "open": None, "high": None, "low": None,
            "high_52w": to_float(m["high52"]),
            "low_52w": None, "volume": None, "trade_value": None,
            "status": None, "time": None,
            "source": "page",
        }
    raise ValueError("화면에서 코스피200 지수 카드를 찾지 못했습니다. (페이지 구조가 바뀌었거나 아직 로딩 중일 수 있음)")


def fetch_snapshot_from_page(url, browser_path=None):
    browser = browser_path or find_browser()
    if not browser:
        raise RuntimeError("Edge/Chrome을 찾지 못했습니다. --browser 로 실행 파일 경로를 알려 주세요.")
    return parse_card(render_page(url, browser))


# ---------- 출력 / 저장 ----------

def fmt(value, spec=",.2f", suffix=""):
    return "-" if value is None else f"{value:{spec}}{suffix}"


def print_snapshot(s):
    arrow = "▲" if (s["change"] or 0) > 0 else "▼" if (s["change"] or 0) < 0 else "-"
    print(f"{s['name']}  {fmt(s['price'])}  {arrow} {fmt(abs(s['change']) if s['change'] is not None else None)}"
          f" ({fmt(s['change_rate'], '+.2f', '%')})")
    lines = [
        ("전일 종가", s["prev_close"]), ("시가", s["open"]), ("고가", s["high"]), ("저가", s["low"]),
        ("52주 최고", s["high_52w"]), ("52주 최저", s["low_52w"]),
    ]
    print("  " + "   ".join(f"{k} {fmt(v)}" for k, v in lines if v is not None))
    if s["volume"] is not None:
        print(f"  거래량 {s['volume'] / 1000:,.0f}천주   거래대금 {s['trade_value'] / 1e8:,.0f}억원")
    print(f"  기준 시각 {s['time'] or '-'}  ({s['status'] or '-'})  [출처: {'JSON API' if s['source'] == 'api' else '렌더링한 화면'}]")


def print_history(rows):
    print(f"\n{'날짜':<12}{'종가':>10}{'전일대비':>10}{'등락률':>9}{'시가':>10}{'고가':>10}{'저가':>10}")
    for r in rows:
        print(f"{r['date']:<12}{fmt(r['close']):>10}{fmt(r['change'], '+,.2f'):>10}"
              f"{fmt(r['change_rate'], '+.2f', '%'):>9}{fmt(r['open']):>10}{fmt(r['high']):>10}{fmt(r['low']):>10}")


def save(prefix, snapshot, history):
    with open(f"{prefix}.json", "w", encoding="utf-8") as f:
        json.dump({"snapshot": snapshot, "history": history}, f, ensure_ascii=False, indent=2)
    saved = [f"{prefix}.json"]
    if history:
        # utf-8-sig: 엑셀에서 열어도 한글이 깨지지 않는다
        with open(f"{prefix}_history.csv", "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(history[0]))
            writer.writeheader()
            writer.writerows(history)
        saved.append(f"{prefix}_history.csv")
    print(f"\n저장 완료: {', '.join(saved)}")


def main():
    parser = argparse.ArgumentParser(description="네이버 증권 코스피200 지수 크롤러")
    parser.add_argument("-d", "--days", type=int, default=20, help="가져올 일별 시세 일수 (기본: 20, 0이면 생략)")
    parser.add_argument("-o", "--output", default="kospi200", help="저장 파일 이름(확장자 제외)")
    parser.add_argument("--render", action="store_true",
                        help="현재 지수를 브라우저로 렌더링한 화면에서 BeautifulSoup으로 읽는다")
    parser.add_argument("--browser", help="Edge/Chrome 실행 파일 경로 (--render 용, 기본은 자동 탐색)")
    parser.add_argument("--url", default=PAGE_URL, help="--render 로 읽을 페이지 (기본: 국내 증시 홈)")
    args = parser.parse_args()

    session = requests.Session()
    session.headers.update(HEADERS)
    try:
        if args.render:
            print("브라우저로 페이지를 렌더링하는 중… (10~20초 걸립니다)")
            snapshot = fetch_snapshot_from_page(args.url, args.browser)
        else:
            snapshot = fetch_snapshot(session)
        history = fetch_history(session, args.days) if args.days > 0 else []
    except (requests.RequestException, RuntimeError, ValueError, OSError, subprocess.TimeoutExpired) as e:
        print(f"수집 실패: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)

    print_snapshot(snapshot)
    if history:
        print_history(history)
    save(args.output, snapshot, history)


if __name__ == "__main__":
    main()
