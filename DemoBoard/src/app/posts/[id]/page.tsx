import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, Edit2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CommentSection } from "@/components/board/comment-section";
import { getPost, listComments, viewPost } from "@/lib/db";
import { categoryLabel } from "@/lib/types";
import { DeletePostDialog } from "@/components/board/delete-post-dialog";

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPost(parseInt(id, 10));

  if (!post) {
    return { title: "글을 찾을 수 없습니다" };
  }

  return {
    title: post.title,
    description: post.content.substring(0, 160),
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);

  if (isNaN(postId)) {
    notFound();
  }

  // Increment view counter and get post
  const post = await viewPost(postId);
  if (!post) {
    notFound();
  }

  // Get comments
  const comments = await listComments(postId);

  const createdDate = new Date(post.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updatedDate = new Date(post.updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isUpdated = post.createdAt !== post.updatedAt;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Post Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge>{categoryLabel(post.category)}</Badge>
            </div>
            <h1 className="text-3xl font-bold break-words">{post.title}</h1>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-b py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>{post.author}</span>
            <span>{createdDate}</span>
            {isUpdated && <span className="text-xs">(수정됨 {updatedDate})</span>}
          </div>
          <div className="flex items-center gap-2">
            <span>조회 {post.views}</span>
          </div>
        </div>
      </div>

      {/* Post Content */}
      <Card className="p-6">
        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap break-words">
          {post.content}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Link href={`/posts/${postId}/edit`}>
          <Button variant="outline" size="sm">
            <Edit2 className="size-4 mr-2" />
            수정
          </Button>
        </Link>
        <DeletePostDialog postId={postId} />
      </div>

      {/* Comments Section */}
      <CommentSection
        postId={postId}
        comments={comments}
        onCommentAdded={() => {
          // This will trigger a revalidation via the server action
        }}
      />

      {/* Back Button */}
      <div className="pt-4">
        <Link href="/">
          <Button variant="outline">← 목록으로</Button>
        </Link>
      </div>
    </div>
  );
}
