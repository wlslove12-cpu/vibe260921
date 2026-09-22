"use client";

import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CATEGORIES } from "@/lib/types";

interface SearchBarProps {
  initialQ: string;
  initialCategory: string;
}

export function SearchBar({ initialQ, initialCategory }: SearchBarProps) {
  const router = useRouter();

  const handleSearch = (query: string, cat: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (cat && cat !== "all") params.set("category", cat);
    params.set("page", "1");
    router.push(`/?${params.toString()}`);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            placeholder="검색"
            defaultValue={initialQ}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const target = e.target as HTMLInputElement;
                handleSearch(target.value, initialCategory);
              }
            }}
          />
          <select
            defaultValue={initialCategory || "all"}
            onChange={(e) => handleSearch(initialQ, e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background"
          >
            <option value="all">모든 카테고리</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}
