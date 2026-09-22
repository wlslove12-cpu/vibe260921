import Link from "next/link";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  current: number;
  total: number;
  href: (page: number) => string;
}

export function Pagination({ current, total, href }: PaginationProps) {
  if (total <= 1) return null;

  const pages = Array.from({ length: total }, (_, i) => i + 1);
  const showPages = pages.slice(
    Math.max(0, current - 3),
    Math.min(total, current + 2)
  );

  return (
    <div className="flex justify-center gap-2 mt-8">
      {current > 1 && (
        <Link href={href(current - 1)}>
          <Button variant="outline" size="sm">
            ← 이전
          </Button>
        </Link>
      )}

      {showPages[0] > 1 && (
        <>
          <Link href={href(1)}>
            <Button variant="outline" size="sm">
              1
            </Button>
          </Link>
          {showPages[0] > 2 && <span className="px-2 py-1">···</span>}
        </>
      )}

      {showPages.map((page) => (
        <Link key={page} href={href(page)}>
          <Button
            variant={page === current ? "default" : "outline"}
            size="sm"
          >
            {page}
          </Button>
        </Link>
      ))}

      {showPages[showPages.length - 1] < total && (
        <>
          {showPages[showPages.length - 1] < total - 1 && (
            <span className="px-2 py-1">···</span>
          )}
          <Link href={href(total)}>
            <Button variant="outline" size="sm">
              {total}
            </Button>
          </Link>
        </>
      )}

      {current < total && (
        <Link href={href(current + 1)}>
          <Button variant="outline" size="sm">
            다음 →
          </Button>
        </Link>
      )}
    </div>
  );
}
