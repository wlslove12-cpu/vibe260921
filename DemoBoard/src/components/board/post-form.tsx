"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createPostAction, updatePostAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/types";
import type { ActionState, PostInput } from "@/lib/types";

interface PostFormProps {
  mode: "create" | "edit";
  postId?: number;
  initial?: Partial<PostInput>;
  onSuccess?: () => void;
}

export function PostForm({ mode, postId, initial, onSuccess }: PostFormProps) {
  const ref = useRef<HTMLFormElement>(null);
  const isMutation = mode === "edit" && postId;

  const action = async (_state: ActionState, data: FormData): Promise<ActionState> => {
    if (isMutation && postId) {
      return updatePostAction(postId, undefined, data);
    }
    return createPostAction(undefined, data);
  };

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    action,
    { ok: false }
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(mode === "create" ? "글이 등록되었습니다" : "글이 수정되었습니다");
      if (onSuccess) onSuccess();
      if (mode === "create") ref.current?.reset();
    } else if (state.message && !state.ok) {
      toast.error(state.message);
    }
  }, [state, mode, onSuccess]);

  return (
    <Card className="p-6">
      <form ref={ref} action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">카테고리</Label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? ""}
            className="w-full px-3 py-2 border border-border rounded-md bg-background"
            disabled={isPending}
          >
            <option value="">선택하세요</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          {state.fieldErrors?.category && (
            <p className="text-sm text-destructive">{state.fieldErrors.category}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            name="title"
            placeholder="제목을 입력하세요"
            defaultValue={initial?.title ?? ""}
            disabled={isPending}
          />
          {state.fieldErrors?.title && (
            <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="author">작성자</Label>
          <Input
            id="author"
            name="author"
            placeholder="이름을 입력하세요"
            defaultValue={initial?.author ?? ""}
            disabled={isPending || mode === "edit"}
          />
          {state.fieldErrors?.author && (
            <p className="text-sm text-destructive">{state.fieldErrors.author}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">내용</Label>
          <Textarea
            id="content"
            name="content"
            placeholder="내용을 입력하세요"
            defaultValue={initial?.content ?? ""}
            rows={8}
            disabled={isPending}
          />
          {state.fieldErrors?.content && (
            <p className="text-sm text-destructive">{state.fieldErrors.content}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="수정/삭제할 때 사용합니다"
              disabled={isPending}
              defaultValue=""
            />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="password2">비밀번호 확인</Label>
              <Input
                id="password2"
                name="password2"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isPending}
                defaultValue=""
              />
              {state.fieldErrors?.password2 && (
                <p className="text-sm text-destructive">{state.fieldErrors.password2}</p>
              )}
            </div>
          )}
        </div>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending
            ? "저장 중..."
            : mode === "create"
              ? "글 등록"
              : "글 수정"}
        </Button>
      </form>
    </Card>
  );
}
