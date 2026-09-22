-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  postId BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId);

-- Insert sample data
INSERT INTO posts (title, content, author, category, passwordHash, views, createdAt, updatedAt)
VALUES
  (
    'DemoBoard에 오신 것을 환영합니다 👋',
    'Next.js, shadcn/ui, TypeScript로 만든 게시판 데모입니다.

- 글쓰기 / 수정 / 삭제
- 댓글
- 검색 · 카테고리 · 페이지네이션
- 다크 모드

수정과 삭제는 글을 쓸 때 정한 비밀번호가 필요합니다. (이 샘플 글의 비밀번호: 1234)',
    '관리자',
    'info',
    '$2a$10$j9YRF0VQwEeFd7rDVkxvZuNZJ7hCJ5y0PBb7mJ2Xq7J7d8X5K5bK.', -- hashed "1234"
    42,
    NOW() - INTERVAL '72 hours',
    NOW() - INTERVAL '72 hours'
  ),
  (
    'shadcn/ui 컴포넌트는 어떻게 추가하나요?',
    '`npx shadcn@latest add button` 처럼 CLI로 필요한 컴포넌트만 프로젝트에 복사해서 쓰면 됩니다.
복사된 코드는 `src/components/ui`에 있으니 자유롭게 수정할 수 있어요.',
    '새내기',
    'question',
    '$2a$10$j9YRF0VQwEeFd7rDVkxvZuNZJ7hCJ5y0PBb7mJ2Xq7J7d8X5K5bK.',
    17,
    NOW() - INTERVAL '30 hours',
    NOW() - INTERVAL '30 hours'
  ),
  (
    '오늘 배운 App Router 정리',
    '서버 컴포넌트에서 바로 데이터를 읽고, 서버 액션으로 폼을 처리하니 API 라우트가 거의 필요 없었습니다.
params와 searchParams가 Promise라는 점만 기억하면 편해요.',
    '개발자K',
    'review',
    '$2a$10$j9YRF0VQwEeFd7rDVkxvZuNZJ7hCJ5y0PBb7mJ2Xq7J7d8X5K5bK.',
    9,
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '5 hours'
  );

-- Insert sample comment
INSERT INTO comments (postId, author, content, passwordHash, createdAt)
VALUES (
  2,
  '관리자',
  '맞아요! 컴포넌트 코드가 프로젝트 안에 들어오니까 커스터마이징이 쉽습니다.',
  '$2a$10$j9YRF0VQwEeFd7rDVkxvZuNZJ7hCJ5y0PBb7mJ2Xq7J7d8X5K5bK.',
  NOW() - INTERVAL '28 hours'
);
