export const CATEGORIES = [
  { value: "free", label: "자유" },
  { value: "question", label: "질문" },
  { value: "info", label: "정보" },
  { value: "review", label: "후기" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((c) => c.value === value);
}

export function categoryLabel(value: Category): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  category: Category;
  passwordHash: string;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  postId: number;
  author: string;
  content: string;
  passwordHash: string;
  createdAt: string;
}

export interface PostInput {
  title: string;
  content: string;
  author: string;
  category: Category;
}

/** Post shape that is safe to send to the client (no password hash). */
export type PublicPost = Omit<Post, "passwordHash">;
export type PublicComment = Omit<Comment, "passwordHash">;

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Partial<Record<string, string>>;
};
