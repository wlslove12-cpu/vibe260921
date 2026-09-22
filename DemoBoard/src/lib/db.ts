import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/password";
import type {
  Category,
  Comment,
  Post,
  PublicComment,
  PublicPost,
} from "@/lib/types";

/**
 * A tiny JSON-file backed store. Good enough for a demo board; swap this
 * module for a real database (SQLite/Postgres) without touching the pages.
 */

interface Store {
  nextPostId: number;
  nextCommentId: number;
  posts: Post[];
  comments: Comment[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "board.json");

// Keep one write queue across dev-server module reloads.
const globalForDb = globalThis as unknown as { __boardWriteQueue?: Promise<unknown> };

function seed(): Store {
  const now = Date.now();
  const ago = (hours: number) => new Date(now - hours * 3_600_000).toISOString();
  const pw = hashPassword("1234");

  const posts: Post[] = [
    {
      id: 1,
      title: "DemoBoard에 오신 것을 환영합니다 👋",
      content:
        "Next.js, shadcn/ui, TypeScript로 만든 게시판 데모입니다.\n\n" +
        "- 글쓰기 / 수정 / 삭제\n- 댓글\n- 검색 · 카테고리 · 페이지네이션\n- 다크 모드\n\n" +
        "수정과 삭제는 글을 쓸 때 정한 비밀번호가 필요합니다. (이 샘플 글의 비밀번호: 1234)",
      author: "관리자",
      category: "info",
      passwordHash: pw,
      views: 42,
      createdAt: ago(72),
      updatedAt: ago(72),
    },
    {
      id: 2,
      title: "shadcn/ui 컴포넌트는 어떻게 추가하나요?",
      content:
        "`npx shadcn@latest add button` 처럼 CLI로 필요한 컴포넌트만 프로젝트에 복사해서 쓰면 됩니다.\n" +
        "복사된 코드는 `src/components/ui`에 있으니 자유롭게 수정할 수 있어요.",
      author: "새내기",
      category: "question",
      passwordHash: pw,
      views: 17,
      createdAt: ago(30),
      updatedAt: ago(30),
    },
    {
      id: 3,
      title: "오늘 배운 App Router 정리",
      content:
        "서버 컴포넌트에서 바로 데이터를 읽고, 서버 액션으로 폼을 처리하니 API 라우트가 거의 필요 없었습니다.\n" +
        "params와 searchParams가 Promise라는 점만 기억하면 편해요.",
      author: "개발자K",
      category: "review",
      passwordHash: pw,
      views: 9,
      createdAt: ago(5),
      updatedAt: ago(5),
    },
  ];

  const comments: Comment[] = [
    {
      id: 1,
      postId: 2,
      author: "관리자",
      content: "맞아요! 컴포넌트 코드가 프로젝트 안에 들어오니까 커스터마이징이 쉽습니다.",
      passwordHash: pw,
      createdAt: ago(28),
    },
  ];

  return { nextPostId: 4, nextCommentId: 2, posts, comments };
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Store;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    const initial = seed();
    await writeStore(initial);
    return initial;
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, DATA_FILE);
}

/** Serialise read-modify-write cycles so concurrent requests can't clobber each other. */
function mutate<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const previous = globalForDb.__boardWriteQueue ?? Promise.resolve();
  const run = previous.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  globalForDb.__boardWriteQueue = run.catch(() => undefined);
  return run;
}

const toPublicPost = ({ passwordHash: _hash, ...post }: Post): PublicPost => post;
const toPublicComment = ({ passwordHash: _hash, ...c }: Comment): PublicComment => c;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface ListPostsParams {
  q?: string;
  category?: Category;
  page: number;
  pageSize: number;
}

export interface ListPostsResult {
  posts: (PublicPost & { commentCount: number })[];
  total: number;
  totalPages: number;
  page: number;
}

export async function listPosts({
  q,
  category,
  page,
  pageSize,
}: ListPostsParams): Promise<ListPostsResult> {
  await connection();
  const store = await readStore();

  const needle = q?.trim().toLowerCase();
  const filtered = store.posts
    .filter((p) => !category || p.category === category)
    .filter(
      (p) =>
        !needle ||
        p.title.toLowerCase().includes(needle) ||
        p.content.toLowerCase().includes(needle) ||
        p.author.toLowerCase().includes(needle),
    )
    .sort((a, b) => b.id - a.id);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;

  const counts = new Map<number, number>();
  for (const c of store.comments) counts.set(c.postId, (counts.get(c.postId) ?? 0) + 1);

  return {
    posts: filtered.slice(start, start + pageSize).map((p) => ({
      ...toPublicPost(p),
      commentCount: counts.get(p.id) ?? 0,
    })),
    total,
    totalPages,
    page: current,
  };
}

export async function getPost(id: number): Promise<PublicPost | null> {
  await connection();
  const store = await readStore();
  const post = store.posts.find((p) => p.id === id);
  return post ? toPublicPost(post) : null;
}

/** Increment the view counter and return the post, or null if it doesn't exist. */
export async function viewPost(id: number): Promise<PublicPost | null> {
  await connection();
  return mutate((store) => {
    const post = store.posts.find((p) => p.id === id);
    if (!post) return null;
    post.views += 1;
    return toPublicPost(post);
  });
}

export async function listComments(postId: number): Promise<PublicComment[]> {
  await connection();
  const store = await readStore();
  return store.comments
    .filter((c) => c.postId === postId)
    .sort((a, b) => a.id - b.id)
    .map(toPublicComment);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface PostInput {
  title: string;
  content: string;
  author: string;
  category: Category;
}

export function createPost(input: PostInput, password: string): Promise<number> {
  const passwordHash = hashPassword(password);
  return mutate((store) => {
    const now = new Date().toISOString();
    const id = store.nextPostId++;
    store.posts.push({
      id,
      ...input,
      passwordHash,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  });
}

export type MutationResult = "ok" | "not-found" | "wrong-password";

export function updatePost(
  id: number,
  input: Pick<PostInput, "title" | "content" | "category">,
  password: string,
): Promise<MutationResult> {
  return mutate((store) => {
    const post = store.posts.find((p) => p.id === id);
    if (!post) return "not-found";
    if (!verifyPassword(password, post.passwordHash)) return "wrong-password";
    Object.assign(post, input, { updatedAt: new Date().toISOString() });
    return "ok";
  });
}

export function deletePost(id: number, password: string): Promise<MutationResult> {
  return mutate((store) => {
    const index = store.posts.findIndex((p) => p.id === id);
    if (index === -1) return "not-found";
    if (!verifyPassword(password, store.posts[index].passwordHash)) return "wrong-password";
    store.posts.splice(index, 1);
    store.comments = store.comments.filter((c) => c.postId !== id);
    return "ok";
  });
}

export function createComment(
  postId: number,
  input: { author: string; content: string },
  password: string,
): Promise<"ok" | "not-found"> {
  const passwordHash = hashPassword(password);
  return mutate((store) => {
    if (!store.posts.some((p) => p.id === postId)) return "not-found";
    store.comments.push({
      id: store.nextCommentId++,
      postId,
      ...input,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    return "ok";
  });
}

export function deleteComment(id: number, password: string): Promise<MutationResult> {
  return mutate((store) => {
    const index = store.comments.findIndex((c) => c.id === id);
    if (index === -1) return "not-found";
    if (!verifyPassword(password, store.comments[index].passwordHash)) return "wrong-password";
    store.comments.splice(index, 1);
    return "ok";
  });
}
