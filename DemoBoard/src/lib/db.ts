import "server-only";

import { connection } from "next/server";

import { hashPassword, verifyPassword } from "@/lib/password";
import { supabase } from "@/lib/supabase";
import type {
  Category,
  Comment,
  Post,
  PublicComment,
  PublicPost,
} from "@/lib/types";

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

  let query = supabase
    .from("posts")
    .select("*, comments:comments(id)", { count: "exact" });

  if (category) {
    query = query.eq("category", category);
  }

  if (q) {
    const needle = q.trim();
    query = query.or(
      `title.ilike.%${needle}%,content.ilike.%${needle}%,author.ilike.%${needle}%`
    );
  }

  query = query.order("id", { ascending: false });

  const { data: posts, count } = await query;

  if (!posts) {
    return {
      posts: [],
      total: 0,
      totalPages: 0,
      page: 1,
    };
  }

  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * pageSize;

  const paginatedPosts = posts.slice(start, start + pageSize);

  return {
    posts: paginatedPosts.map((p) => ({
      ...toPublicPost(p as Post),
      commentCount: (p.comments as unknown as Comment[])?.length ?? 0,
    })),
    total,
    totalPages,
    page: current,
  };
}

export async function getPost(id: number): Promise<PublicPost | null> {
  await connection();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  return post ? toPublicPost(post as Post) : null;
}

export async function viewPost(id: number): Promise<PublicPost | null> {
  await connection();
  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) return null;

  await supabase
    .from("posts")
    .update({ views: (post.views || 0) + 1 })
    .eq("id", id);

  return toPublicPost({ ...post, views: (post.views || 0) + 1 } as Post);
}

export async function listComments(postId: number): Promise<PublicComment[]> {
  await connection();
  const { data: comments } = await supabase
    .from("comments")
    .select("*")
    .eq("postId", postId)
    .order("id", { ascending: true });

  return (comments || []).map((c) => toPublicComment(c as Comment));
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

export async function createPost(input: PostInput, password: string): Promise<number> {
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      ...input,
      passwordHash,
      views: 0,
      createdAt: now,
      updatedAt: now,
    })
    .select("id")
    .single();

  if (error || !data) throw error || new Error("Failed to create post");
  return data.id as number;
}

export type MutationResult = "ok" | "not-found" | "wrong-password";

export async function updatePost(
  id: number,
  input: Pick<PostInput, "title" | "content" | "category">,
  password: string,
): Promise<MutationResult> {
  const { data: post } = await supabase
    .from("posts")
    .select("passwordHash")
    .eq("id", id)
    .single();

  if (!post) return "not-found";
  if (!verifyPassword(password, post.passwordHash)) return "wrong-password";

  const { error } = await supabase
    .from("posts")
    .update({
      ...input,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", id);

  return error ? "not-found" : "ok";
}

export async function deletePost(id: number, password: string): Promise<MutationResult> {
  const { data: post } = await supabase
    .from("posts")
    .select("passwordHash")
    .eq("id", id)
    .single();

  if (!post) return "not-found";
  if (!verifyPassword(password, post.passwordHash)) return "wrong-password";

  await supabase.from("comments").delete().eq("postId", id);
  const { error } = await supabase.from("posts").delete().eq("id", id);

  return error ? "not-found" : "ok";
}

export async function createComment(
  postId: number,
  input: { author: string; content: string },
  password: string,
): Promise<"ok" | "not-found"> {
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .single();

  if (!post) return "not-found";

  const passwordHash = hashPassword(password);
  const { error } = await supabase.from("comments").insert({
    postId,
    ...input,
    passwordHash,
    createdAt: new Date().toISOString(),
  });

  return error ? "not-found" : "ok";
}

export async function deleteComment(id: number, password: string): Promise<MutationResult> {
  const { data: comment } = await supabase
    .from("comments")
    .select("passwordHash")
    .eq("id", id)
    .single();

  if (!comment) return "not-found";
  if (!verifyPassword(password, comment.passwordHash)) return "wrong-password";

  const { error } = await supabase.from("comments").delete().eq("id", id);

  return error ? "not-found" : "ok";
}
