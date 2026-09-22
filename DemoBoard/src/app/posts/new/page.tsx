import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PostForm } from "@/components/board/post-form";

export default function NewPostPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">새 글 작성</h1>
        <Link href="/">
          <Button variant="outline">취소</Button>
        </Link>
      </div>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-900 dark:text-blue-100">
        ℹ️ 비밀번호는 추후 글을 수정하거나 삭제할 때 필요합니다.
      </div>
      <PostForm mode="create" />
    </div>
  );
}
