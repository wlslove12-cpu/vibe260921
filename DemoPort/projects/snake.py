import random
import tkinter as tk
from collections import deque

CELL = 20
COLS = 30
ROWS = 20
WIDTH = CELL * COLS
HEIGHT = CELL * ROWS
DELAY = 120  # ms per tick
NUM_FOOD = 3  # apples on the board at once
TARGET = 10  # first to eat this many apples wins

MOVES = [(0, -1), (0, 1), (-1, 0), (1, 0)]
KEYS = {
    "Up": (0, -1),
    "Down": (0, 1),
    "Left": (-1, 0),
    "Right": (1, 0),
    "w": (0, -1),
    "s": (0, 1),
    "a": (-1, 0),
    "d": (1, 0),
}


class Snake:
    def __init__(self, name, head, direction, color, head_color):
        self.name = name
        self.color = color
        self.head_color = head_color
        # 3 segments trailing behind the head
        self.body = [(head[0] - direction[0] * i, head[1] - direction[1] * i) for i in range(3)]
        self.direction = direction
        self.pending = direction  # human input, applied on the next tick
        self.score = 0

    @property
    def head(self):
        return self.body[0]


class SnakeGame:
    def __init__(self, root):
        self.root = root
        root.title("Snake: You vs AI")
        root.resizable(False, False)

        self.wins = {"You": 0, "AI": 0}
        self.you_var = tk.StringVar()
        self.ai_var = tk.StringVar()
        bar = tk.Frame(root)
        bar.pack(fill="x", padx=10)
        tk.Label(bar, textvariable=self.you_var, font=("Consolas", 14, "bold"), fg="#27ae60").pack(side="left")
        tk.Label(bar, textvariable=self.ai_var, font=("Consolas", 14, "bold"), fg="#2471a3").pack(side="right")
        tk.Label(root, text=f"Arrows/WASD: move   P: pause   R: restart   First to {TARGET} apples wins",
                 font=("Consolas", 10)).pack()

        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg="#1e1e1e", highlightthickness=0)
        self.canvas.pack()

        self.job = None
        root.bind("<Key>", self.on_key)
        self.reset()

    def reset(self):
        self.you = Snake("You", (5, 6), (1, 0), "#2ecc71", "#27ae60")
        self.ai = Snake("AI", (COLS - 6, ROWS - 7), (-1, 0), "#5dade2", "#2471a3")
        self.foods = []
        self.result = None
        self.paused = False
        self.fill_foods()
        self.update_scores()
        self.draw()
        self.schedule()

    def schedule(self):
        if self.job is not None:
            self.root.after_cancel(self.job)
        self.job = self.root.after(DELAY, self.tick)

    def update_scores(self):
        self.you_var.set(f"YOU {self.you.score}/{TARGET}  (wins {self.wins['You']})")
        self.ai_var.set(f"AI {self.ai.score}/{TARGET}  (wins {self.wins['AI']})")

    # ---------- apples ----------

    def fill_foods(self):
        taken = set(self.you.body) | set(self.ai.body) | set(self.foods)
        free = [(x, y) for x in range(COLS) for y in range(ROWS) if (x, y) not in taken]
        random.shuffle(free)
        while len(self.foods) < NUM_FOOD and free:
            self.foods.append(free.pop())

    # ---------- AI ----------

    def explore(self, start, blocked):
        """BFS from start: returns (reachable area, distance to nearest apple or None)."""
        seen = {start}
        queue = deque([(start, 0)])
        nearest = None
        while queue:
            (x, y), dist = queue.popleft()
            if nearest is None and (x, y) in self.foods:
                nearest = dist
            for dx, dy in MOVES:
                n = (x + dx, y + dy)
                if 0 <= n[0] < COLS and 0 <= n[1] < ROWS and n not in blocked and n not in seen:
                    seen.add(n)
                    queue.append((n, dist + 1))
        return len(seen), nearest

    def ai_choose(self):
        ai, you = self.ai, self.you
        # tails move away next tick, so they are not obstacles
        blocked = set(ai.body[:-1]) | set(you.body[:-1])
        # cells the human could step into next tick (avoid head-on collisions)
        rival = {(you.head[0] + dx, you.head[1] + dy) for dx, dy in MOVES
                 if (dx, dy) != (-you.direction[0], -you.direction[1])}

        options = []
        for d in MOVES:
            if d == (-ai.direction[0], -ai.direction[1]):
                continue
            c = (ai.head[0] + d[0], ai.head[1] + d[1])
            if not (0 <= c[0] < COLS and 0 <= c[1] < ROWS) or c in blocked:
                continue
            area, dist = self.explore(c, blocked)
            # prefer: enough room to survive, not a head-on risk, closest apple, more room
            options.append((area < len(ai.body), c in rival, 999 if dist is None else dist, -area, d))
        if not options:
            return ai.direction  # trapped
        return min(options)[-1]

    # ---------- game loop ----------

    def on_key(self, event):
        key = event.keysym
        if key.lower() == "r":
            if self.result:
                self.reset()
            return
        if key.lower() == "p" and not self.result:
            self.paused = not self.paused
            if not self.paused:
                self.schedule()
            self.draw()
            return
        d = KEYS.get(key) or KEYS.get(key.lower())
        # ignore reversing into yourself
        if d and d != (-self.you.direction[0], -self.you.direction[1]):
            self.you.pending = d

    def tick(self):
        self.job = None
        if self.result or self.paused:
            return
        self.step()
        self.draw()
        if not self.result:
            self.schedule()

    def step(self):
        you, ai = self.you, self.ai
        ai.direction = self.ai_choose()  # decided before applying the human's new input
        you.direction = you.pending

        new_you = (you.head[0] + you.direction[0], you.head[1] + you.direction[1])
        new_ai = (ai.head[0] + ai.direction[0], ai.head[1] + ai.direction[1])
        eat_you = new_you in self.foods
        eat_ai = new_ai in self.foods

        # tails move away unless the snake is growing
        obstacles = set(you.body if eat_you else you.body[:-1]) | set(ai.body if eat_ai else ai.body[:-1])

        def crashed(cell):
            return not (0 <= cell[0] < COLS and 0 <= cell[1] < ROWS) or cell in obstacles

        you_dead = crashed(new_you) or new_you == new_ai
        ai_dead = crashed(new_ai) or new_you == new_ai
        if you_dead or ai_dead:
            if you_dead and ai_dead:
                self.finish_by_score()
            else:
                self.finish("AI" if you_dead else "You")
            return

        you.body.insert(0, new_you)
        ai.body.insert(0, new_ai)
        for snake, ate, cell in ((you, eat_you, new_you), (ai, eat_ai, new_ai)):
            if ate:
                snake.score += 1
                self.foods.remove(cell)
            else:
                snake.body.pop()
        self.fill_foods()
        self.update_scores()

        if you.score >= TARGET or ai.score >= TARGET:
            self.finish_by_score()

    def finish_by_score(self):
        if self.you.score > self.ai.score:
            self.finish("You")
        elif self.ai.score > self.you.score:
            self.finish("AI")
        else:
            self.finish(None)

    def finish(self, winner):
        self.result = "DRAW" if winner is None else ("YOU WIN!" if winner == "You" else "AI WINS!")
        if winner:
            self.wins[winner] += 1
        self.update_scores()

    # ---------- drawing ----------

    def draw_cell(self, cell, color):
        x, y = cell
        self.canvas.create_rectangle(
            x * CELL + 1, y * CELL + 1, (x + 1) * CELL - 1, (y + 1) * CELL - 1, fill=color, outline=""
        )

    def draw(self):
        self.canvas.delete("all")
        for fx, fy in self.foods:
            self.canvas.create_oval(
                fx * CELL + 2, fy * CELL + 2, (fx + 1) * CELL - 2, (fy + 1) * CELL - 2, fill="#e74c3c", outline=""
            )
        for snake in (self.you, self.ai):
            for i, cell in enumerate(snake.body):
                self.draw_cell(cell, snake.color if i else snake.head_color)
            hx, hy = snake.head
            self.canvas.create_text(hx * CELL + CELL // 2, hy * CELL + CELL // 2, text=snake.name[0],
                                    fill="white", font=("Consolas", 9, "bold"))
        if self.result:
            self.overlay(self.result, "Press R to restart")
        elif self.paused:
            self.overlay("PAUSED", "Press P to resume")

    def overlay(self, title, subtitle):
        self.canvas.create_text(WIDTH // 2, HEIGHT // 2 - 15, text=title, fill="white", font=("Consolas", 32, "bold"))
        self.canvas.create_text(WIDTH // 2, HEIGHT // 2 + 25, text=subtitle, fill="#cccccc", font=("Consolas", 16))


if __name__ == "__main__":
    root = tk.Tk()
    SnakeGame(root)
    root.mainloop()
