"""블록깨기 (Breakout) - Python 내장 tkinter만 사용

조작법
  - 마우스 이동 / 좌우 방향키 : 패들 이동
  - 스페이스 / 마우스 클릭    : 공 발사 (게임 오버 후에는 재시작)
  - P : 일시정지 / 재개
  - R : 처음부터 다시 시작
"""
import math
import random
import tkinter as tk

WIDTH, HEIGHT = 640, 520
HUD_H = 36                      # 상단 점수판 높이

PADDLE_W, PADDLE_H = 100, 12
PADDLE_Y = HEIGHT - 40
PADDLE_SPEED = 9
MAX_BOUNCE_ANGLE = math.radians(60)

BALL_R = 7
BASE_SPEED = 6.0                # 프레임당 픽셀
SPEED_PER_LEVEL = 0.8
MAX_SPEED = 12.0

BRICK_COLS, BRICK_ROWS = 10, 6
BRICK_W = WIDTH // BRICK_COLS
BRICK_H = 22
BRICK_TOP = HUD_H + 30
ROW_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"]
ROW_POINTS = [60, 50, 40, 30, 20, 10]

START_LIVES = 3
FRAME_MS = 16                   # 약 60 FPS

FONT = ("Malgun Gothic", 13, "bold")
FONT_BIG = ("Malgun Gothic", 22, "bold")


class Breakout:
    def __init__(self, root):
        self.root = root
        root.title("블록깨기")
        root.resizable(False, False)

        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT,
                                bg="#10121a", highlightthickness=0)
        self.canvas.pack()

        self.keys = set()
        root.bind("<KeyPress>", self.on_key_press)
        root.bind("<KeyRelease>", lambda e: self.keys.discard(e.keysym))
        self.canvas.bind("<Motion>", self.on_mouse_move)
        self.canvas.bind("<Button-1>", lambda e: self.launch())

        # 고정 요소는 한 번만 만들고 좌표/텍스트만 갱신한다.
        c = self.canvas
        c.create_line(0, HUD_H, WIDTH, HUD_H, fill="#2a2f45")
        self.score_text = c.create_text(12, HUD_H // 2, anchor="w",
                                        fill="#e5e7eb", font=FONT)
        self.level_text = c.create_text(WIDTH // 2, HUD_H // 2,
                                        fill="#e5e7eb", font=FONT)
        self.lives_text = c.create_text(WIDTH - 12, HUD_H // 2, anchor="e",
                                        fill="#e5e7eb", font=FONT)
        self.paddle = c.create_rectangle(0, 0, 0, 0, fill="#e5e7eb", outline="")
        self.ball = c.create_oval(0, 0, 0, 0, fill="#fbbf24", outline="")
        self.message = c.create_text(WIDTH // 2, HEIGHT // 2 + 60, fill="#ffffff",
                                     font=FONT_BIG, justify="center")

        self.new_game()
        self.tick()

    # ------------------------------------------------------------------ 상태
    def new_game(self):
        self.score = 0
        self.lives = START_LIVES
        self.level = 1
        self.paddle_x = WIDTH / 2          # 패들 중심 x
        self.create_bricks()
        self.reset_ball()

    def create_bricks(self):
        self.canvas.delete("brick")
        self.bricks = []
        for row in range(BRICK_ROWS):
            for col in range(BRICK_COLS):
                x1 = col * BRICK_W
                y1 = BRICK_TOP + row * BRICK_H
                item = self.canvas.create_rectangle(
                    x1 + 1, y1 + 1, x1 + BRICK_W - 1, y1 + BRICK_H - 1,
                    fill=ROW_COLORS[row], outline="", tags="brick")
                self.bricks.append({
                    "id": item, "x1": x1, "y1": y1,
                    "x2": x1 + BRICK_W, "y2": y1 + BRICK_H,
                    "points": ROW_POINTS[row],
                })

    @property
    def speed(self):
        return min(BASE_SPEED + (self.level - 1) * SPEED_PER_LEVEL, MAX_SPEED)

    def reset_ball(self):
        self.state = "ready"
        self.ball_x = self.paddle_x
        self.ball_y = PADDLE_Y - BALL_R
        self.vx = self.vy = 0.0
        self.set_message("스페이스 / 클릭으로 발사")

    def launch(self):
        if self.state == "ready":
            angle = math.radians(random.uniform(-30, 30))
            self.vx = self.speed * math.sin(angle)
            self.vy = -self.speed * math.cos(angle)
            self.state = "playing"
            self.set_message("")
        elif self.state == "over":
            self.new_game()

    def toggle_pause(self):
        if self.state == "playing":
            self.state = "paused"
            self.set_message("일시정지\nP 키로 계속")
        elif self.state == "paused":
            self.state = "playing"
            self.set_message("")

    def set_message(self, text):
        self.canvas.itemconfig(self.message, text=text)

    # ------------------------------------------------------------------ 입력
    def on_key_press(self, event):
        key = event.keysym
        self.keys.add(key)
        key = key.lower()
        if key == "space":
            self.launch()
        elif key == "p":
            self.toggle_pause()
        elif key == "r":
            self.new_game()

    def on_mouse_move(self, event):
        if self.state in ("ready", "playing"):
            self.paddle_x = event.x
            self.clamp_paddle()

    def clamp_paddle(self):
        half = PADDLE_W / 2
        self.paddle_x = max(half, min(WIDTH - half, self.paddle_x))

    # ------------------------------------------------------------------ 루프
    def tick(self):
        if self.state in ("ready", "playing"):
            if "Left" in self.keys:
                self.paddle_x -= PADDLE_SPEED
            if "Right" in self.keys:
                self.paddle_x += PADDLE_SPEED
            self.clamp_paddle()

            if self.state == "ready":
                self.ball_x = self.paddle_x
                self.ball_y = PADDLE_Y - BALL_R
            else:
                self.move_ball()

        self.render()
        self.root.after(FRAME_MS, self.tick)

    def move_ball(self):
        prev_x, prev_y = self.ball_x, self.ball_y
        self.ball_x += self.vx
        self.ball_y += self.vy

        # 벽
        if self.ball_x < BALL_R:
            self.ball_x = BALL_R
            self.vx = abs(self.vx)
        elif self.ball_x > WIDTH - BALL_R:
            self.ball_x = WIDTH - BALL_R
            self.vx = -abs(self.vx)
        if self.ball_y < HUD_H + BALL_R:
            self.ball_y = HUD_H + BALL_R
            self.vy = abs(self.vy)

        # 패들: 맞은 위치에 따라 반사각이 달라진다.
        if (self.vy > 0
                and self.ball_y + BALL_R >= PADDLE_Y
                and prev_y + BALL_R <= PADDLE_Y + 1
                and abs(self.ball_x - self.paddle_x) <= PADDLE_W / 2 + BALL_R):
            offset = (self.ball_x - self.paddle_x) / (PADDLE_W / 2)
            offset = max(-1.0, min(1.0, offset))
            angle = offset * MAX_BOUNCE_ANGLE
            self.vx = self.speed * math.sin(angle)
            self.vy = -self.speed * math.cos(angle)
            self.ball_y = PADDLE_Y - BALL_R

        self.hit_bricks(prev_x)

        # 바닥으로 놓침
        if self.ball_y - BALL_R > HEIGHT:
            self.lives -= 1
            if self.lives <= 0:
                self.state = "over"
                self.set_message(f"GAME OVER\n최종 점수 {self.score}\n스페이스로 다시 시작")
            else:
                self.reset_ball()

    def hit_bricks(self, prev_x):
        """공과 원-사각형 충돌 검사. 한 프레임에 벽돌 하나만 처리한다."""
        for brick in self.bricks:
            nearest_x = max(brick["x1"], min(self.ball_x, brick["x2"]))
            nearest_y = max(brick["y1"], min(self.ball_y, brick["y2"]))
            dx, dy = self.ball_x - nearest_x, self.ball_y - nearest_y
            if dx * dx + dy * dy > BALL_R * BALL_R:
                continue

            # 이전 위치가 벽돌의 좌우 바깥이었다면 옆면 충돌, 아니면 윗/아랫면 충돌
            if prev_x + BALL_R <= brick["x1"] or prev_x - BALL_R >= brick["x2"]:
                self.vx = -self.vx
            else:
                self.vy = -self.vy

            self.canvas.delete(brick["id"])
            self.bricks.remove(brick)
            self.score += brick["points"]
            break

        if not self.bricks:
            self.level += 1
            self.create_bricks()
            self.reset_ball()
            self.set_message(f"LEVEL {self.level}\n스페이스 / 클릭으로 발사")

    # ------------------------------------------------------------------ 그리기
    def render(self):
        c = self.canvas
        half = PADDLE_W / 2
        c.coords(self.paddle, self.paddle_x - half, PADDLE_Y,
                 self.paddle_x + half, PADDLE_Y + PADDLE_H)
        c.coords(self.ball, self.ball_x - BALL_R, self.ball_y - BALL_R,
                 self.ball_x + BALL_R, self.ball_y + BALL_R)
        c.itemconfig(self.score_text, text=f"점수 {self.score}")
        c.itemconfig(self.level_text, text=f"레벨 {self.level}")
        c.itemconfig(self.lives_text, text=f"목숨 {'●' * self.lives}")


if __name__ == "__main__":
    root = tk.Tk()
    Breakout(root)
    root.mainloop()
