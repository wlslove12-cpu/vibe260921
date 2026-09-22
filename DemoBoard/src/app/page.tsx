import { Suspense } from "react";

import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/board/pagination";
import { PostList } from "@/components/board/post-list";
import { SearchBar } from "@/components/board/search-bar";
import { listPosts } from "@/lib/db";

interface PageProps {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

async function PostsContent({
  q,
  category,
  page,
}: {
  q: string | undefined;
  category: string | undefined;
  page: number;
}) {
  const result = await listPosts({
    q,
    category: (category && (category as never)) || undefined,
    page,
    pageSize: 20,
  });

  return (
    <>
      <PostList posts={result.posts} />
      <Pagination
        current={result.page}
        total={result.totalPages}
        href={(p) => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          if (category) params.set("category", category);
          params.set("page", String(p));
          return `/?${params.toString()}`;
        }}
      />
    </>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category || "";
  const page = parseInt(params.page || "1", 10) || 1;

  return (
    <div className="space-y-6">
      <SearchBar initialQ={q} initialCategory={category} />

      <Suspense fallback={<div className="text-center py-8">로딩 중...</div>}>
        <PostsContent q={q} category={category} page={page} />
      </Suspense>
    </div>
  );
}
