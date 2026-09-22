"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createCommentAction, deleteCommentAction } from "@/app/actions";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState, PublicComment } from "@/lib/types";

interface CommentFormProps {
  postId: number;
  onSuccess?: () => void;
}

function CommentForm({ postId, onSuccess }: CommentFormProps) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (_state: ActionState, data: FormData) => createCommentAction(postId, undefined, data),
    { ok: false }
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("댓글이 등록되었습니다");
      const form = document.querySelector(`[data-comment-form="${postId}"]`) as HTMLFormElement | null;
      form?.reset();
      onSuccess?.();
    } else if (state.message && !state.ok) {
      toast.error(state.message);
    }
  }, [state, postId, onSuccess]);

  return (
    <Card className="p-4" data-comment-form={postId}>
      <h3 className="font-semibold mb-4">댓글 달기</h3>
      <form action={formAction} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`comment-author-${postId}`} className="text-xs">
              이름
            </Label>
            <Input
              id={`comment-author-${postId}`}
              name="author"
              placeholder="이름"
              disabled={isPending}
            />
            {state.fieldErrors?.author && (
              <p className="text-xs text-destructive">{state.fieldErrors.author}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`comment-password-${postId}`} className="text-xs">
              비밀번호
            </Label>
            <Input
              id={`comment-password-${postId}`}
              name="password"
              type="password"
              placeholder="비밀번호"
              disabled={isPending}
            />
            {state.fieldErrors?.password && (
              <p className="text-xs text-destructive">{state.fieldErrors.password}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`comment-content-${postId}`} className="text-xs">
            내용
          </Label>
          <Textarea
            id={`comment-content-${postId}`}
            name="content"
            placeholder="댓글 내용"
            rows={3}
            disabled={isPending}
          />
          {state.fieldErrors?.content && (
            <p className="text-xs text-destructive">{state.fieldErrors.content}</p>
          )}
        </div>

        <Button type="submit" disabled={isPending} size="sm" className="w-full">
          {isPending ? "등록 중..." : "댓글 등록"}
        </Button>
      </form>
    </Card>
  );
}

interface CommentItemProps {
  comment: PublicComment;
  postId: number;
  onDeleted?: () => void;
}

function CommentItem({ comment, postId, onDeleted }: CommentItemProps) {
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      toast.error("비밀번호를 입력하세요");
      return;
    }

    setIsDeleting(true);
    const result = await deleteCommentAction(postId, comment.id, password);
    setIsDeleting(false);

    if (result.ok) {
      toast.success("댓글이 삭제되었습니다");
      setOpen(false);
      setPassword("");
      onDeleted?.();
    } else {
      toast.error(result.message || "삭제에 실패했습니다");
    }
  };

  const date = new Date(comment.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{comment.author}</span>
            <span className="text-xs text-muted-foreground">{date}</span>
          </div>
          <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        </div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <button
            onClick={() => setOpen(true)}
            className="p-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            type="button"
          >
            <Trash2 className="size-4" />
          </button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2 text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <p>삭제한 댓글은 복구할 수 없습니다</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="delete-comment-password" className="text-sm">
                  비밀번호
                </Label>
                <Input
                  id="delete-comment-password"
                  type="password"
                  placeholder="댓글 작성 시 입력한 비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isDeleting}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

interface CommentSectionProps {
  postId: number;
  comments: PublicComment[];
  onCommentAdded?: () => void;
}

export function CommentSection({
  postId,
  comments,
  onCommentAdded,
}: CommentSectionProps) {
  const [key, setKey] = useState(0);

  const handleSuccess = () => {
    setKey((k) => k + 1);
    onCommentAdded?.();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold mb-4">댓글 ({comments.length})</h2>
        {comments.length > 0 ? (
          <Card className="divide-y">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                onDeleted={() => setKey((k) => k + 1)}
              />
            ))}
          </Card>
        ) : (
          <p className="text-sm text-muted-foreground py-4">등록된 댓글이 없습니다</p>
        )}
      </div>

      <CommentForm key={key} postId={postId} onSuccess={handleSuccess} />
    </div>
  );
}
