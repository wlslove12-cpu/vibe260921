"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createComment as dbCreateComment,
  createPost as dbCreatePost,
  deleteComment as dbDeleteComment,
  deletePost as dbDeletePost,
  updatePost as dbUpdatePost,
} from "@/lib/db";
import { isCategory } from "@/lib/types";
import type { ActionState } from "@/lib/types";

function parseFormData(data: FormData) {
  const obj = Object.fromEntries(data.entries());
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, (v as string).trim()])
  );
}

export async function createPostAction(
  _state: unknown,
  data: FormData
): Promise<ActionState> {
  const fields = parseFormData(data);
  const { title, content, author, category, password, password2 } = fields as Record<
    string,
    string
  >;

  // Validation
  const errors: Record<string, string> = {};
  if (!title || title.length < 2) errors.title = "제목은 2자 이상이어야 합니다";
  if (!content || content.length < 2) errors.content = "내용은 2자 이상이어야 합니다";
  if (!author || author.length < 2) errors.author = "작성자명은 2자 이상이어야 합니다";
  if (!category || !isCategory(category)) errors.category = "카테고리를 선택하세요";
  if (!password || password.length < 4) errors.password = "비밀번호는 4자 이상이어야 합니다";
  if (password !== password2) errors.password2 = "비밀번호가 일치하지 않습니다";

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "입력을 다시 확인하세요",
      fieldErrors: errors,
      values: { title, content, author, category },
    };
  }

  try {
    const id = await dbCreatePost(
      { title, content, author, category: category as never },
      password
    );
    revalidatePath("/");
    redirect(`/posts/${id}`);
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      message: "글을 저장할 수 없습니다",
      values: { title, content, author, category },
    };
  }
}

export async function updatePostAction(
  id: number,
  _state: unknown,
  data: FormData
): Promise<ActionState> {
  const fields = parseFormData(data);
  const { title, content, category, password } = fields as Record<string, string>;

  // Validation
  const errors: Record<string, string> = {};
  if (!title || title.length < 2) errors.title = "제목은 2자 이상이어야 합니다";
  if (!content || content.length < 2) errors.content = "내용은 2자 이상이어야 합니다";
  if (!category || !isCategory(category)) errors.category = "카테고리를 선택하세요";
  if (!password) errors.password = "비밀번호를 입력하세요";

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "입력을 다시 확인하세요",
      fieldErrors: errors,
      values: { title, content, category },
    };
  }

  try {
    const result = await dbUpdatePost(
      id,
      { title, content, category: category as never },
      password
    );
    if (result === "not-found") {
      return {
        ok: false,
        message: "글을 찾을 수 없습니다",
        values: { title, content, category },
      };
    }
    if (result === "wrong-password") {
      return {
        ok: false,
        message: "비밀번호가 틀렸습니다",
        fieldErrors: { password: "비밀번호가 일치하지 않습니다" },
        values: { title, content, category },
      };
    }
    revalidatePath("/");
    revalidatePath(`/posts/${id}`);
    redirect(`/posts/${id}`);
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      message: "글을 수정할 수 없습니다",
      values: { title, content, category },
    };
  }
}

export async function deletePostAction(
  id: number,
  password: string
): Promise<ActionState> {
  if (!password) {
    return {
      ok: false,
      message: "비밀번호를 입력하세요",
    };
  }

  try {
    const result = await dbDeletePost(id, password);
    if (result === "not-found") {
      return { ok: false, message: "글을 찾을 수 없습니다" };
    }
    if (result === "wrong-password") {
      return { ok: false, message: "비밀번호가 틀렸습니다" };
    }
    revalidatePath("/");
    redirect("/");
  } catch (err) {
    console.error(err);
    return { ok: false, message: "글을 삭제할 수 없습니다" };
  }
}

export async function createCommentAction(
  postId: number,
  _state: unknown,
  data: FormData
): Promise<ActionState> {
  const fields = parseFormData(data);
  const { author, content, password } = fields as Record<string, string>;

  // Validation
  const errors: Record<string, string> = {};
  if (!author || author.length < 2) errors.author = "이름은 2자 이상이어야 합니다";
  if (!content || content.length < 2) errors.content = "댓글은 2자 이상이어야 합니다";
  if (!password || password.length < 4) errors.password = "비밀번호는 4자 이상이어야 합니다";

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "입력을 다시 확인하세요",
      fieldErrors: errors,
      values: { author, content },
    };
  }

  try {
    const result = await dbCreateComment(postId, { author, content }, password);
    if (result === "not-found") {
      return { ok: false, message: "글을 찾을 수 없습니다" };
    }
    revalidatePath(`/posts/${postId}`);
    return { ok: true, message: "댓글이 등록되었습니다" };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "댓글을 저장할 수 없습니다" };
  }
}

export async function deleteCommentAction(
  postId: number,
  commentId: number,
  password: string
): Promise<ActionState> {
  if (!password) {
    return {
      ok: false,
      message: "비밀번호를 입력하세요",
    };
  }

  try {
    const result = await dbDeleteComment(commentId, password);
    if (result === "not-found") {
      return { ok: false, message: "댓글을 찾을 수 없습니다" };
    }
    if (result === "wrong-password") {
      return { ok: false, message: "비밀번호가 틀렸습니다" };
    }
    revalidatePath(`/posts/${postId}`);
    return { ok: true };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "댓글을 삭제할 수 없습니다" };
  }
}
