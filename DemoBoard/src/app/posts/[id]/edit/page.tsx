import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PostForm } from "@/components/board/post-form";
import { getPost } from "@/lib/db";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPageProps) {
  const { id } = await params;
  const post = await getPost(parseInt(id, 10));

  if (!post) {
    return { title: "글을 찾을 수 없습니다" };
  }

  return {
    title: `${post.title} 수정`,
  };
}

export default async function EditPostPage({ params }: EditPageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) {
    notFound();
  }

  const post = await getPost(postId);
  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">글 수정</h1>
        <Link href={`/posts/${postId}`}>
          <Button variant="outline">취소</Button>
        </Link>
      </div>
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-900 dark:text-blue-100">
        ℹ️ 글을 수정하려면 작성 시 입력한 비밀번호가 필요합니다.
      </div>
      <PostForm
        mode="edit"
        postId={postId}
        initial={{
          title: post.title,
          content: post.content,
          category: post.category,
          author: post.author,
        }}
      />
    </div>
  );
}
