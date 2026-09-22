import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { categoryLabel } from "@/lib/types";
import type { PublicPost } from "@/lib/types";

interface PostListItemProps {
  post: PublicPost & { commentCount: number };
}

export function PostListItem({ post }: PostListItemProps) {
  const createdDate = new Date(post.createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className="p-4 hover:bg-muted transition-colors cursor-pointer">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate hover:underline">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {post.content}
              </p>
            </div>
            <Badge variant="secondary">{categoryLabel(post.category)}</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex gap-3">
              <span>{post.author}</span>
              <span>{createdDate}</span>
            </div>
            <div className="flex gap-3">
              <span>조회 {post.views}</span>
              <span>댓글 {post.commentCount}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

interface PostListProps {
  posts: (PublicPost & { commentCount: number })[];
}

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">등록된 글이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <PostListItem key={post.id} post={post} />
      ))}
    </div>
  );
}
