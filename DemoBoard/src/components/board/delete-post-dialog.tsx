"use client";

import { useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";

import { deletePostAction } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface DeletePostDialogProps {
  postId: number;
}

export function DeletePostDialog({ postId }: DeletePostDialogProps) {
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!password) {
      toast.error("비밀번호를 입력하세요");
      return;
    }

    setIsDeleting(true);
    const result = await deletePostAction(postId, password);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message || "삭제에 실패했습니다");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4 mr-2" />
        삭제
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>글 삭제</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2 text-sm text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <p>삭제한 글은 복구할 수 없습니다</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="delete-password" className="text-sm">
              비밀번호
            </Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="글 작성 시 입력한 비밀번호"
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
  );
}
