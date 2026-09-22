# 📌 DemoBoard

**Next.js, shadcn/ui, TypeScript로 만든 게시판 웹사이트**

## 🎯 주요 기능

- ✅ **게시물 관리**: 글 작성, 읽기, 수정, 삭제 (비밀번호 보호)
- ✅ **댓글 기능**: 게시물별 댓글 작성 및 삭제
- ✅ **검색 & 필터링**: 제목/내용/작성자 검색, 카테고리별 필터링
- ✅ **페이지네이션**: 20개씩 페이지 분할 표시
- ✅ **카테고리**: 자유, 질문, 정보, 후기
- ✅ **다크 모드**: shadcn/ui 테마 지원
- ✅ **반응형 디자인**: 모바일 최적화
- ✅ **로컬 저장소**: JSON 파일 기반 데이터 저장

## 🛠 기술 스택

- **Framework**: [Next.js 16](https://nextjs.org/) - React 기반 풀스택 프레임워크
- **UI Components**: [shadcn/ui](https://shadcn.com/) - 재사용 가능한 컴포넌트 라이브러리
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) - 유틸리티 CSS
- **Language**: [TypeScript](https://www.typescriptlang.org/) - 타입 안정성
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/) - 토스트 알림
- **Data**: JSON 파일 (로컬 저장소)

## 📁 프로젝트 구조

```
DemoBoard/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 루트 레이아웃
│   │   ├── page.tsx             # 게시판 목록 페이지
│   │   ├── actions.ts           # 서버 액션 (CRUD)
│   │   ├── globals.css          # 전역 스타일
│   │   └── posts/
│   │       ├── new/page.tsx      # 글 작성 페이지
│   │       └── [id]/
│   │           ├── page.tsx      # 글 상세 페이지
│   │           └── edit/page.tsx # 글 수정 페이지
│   ├── components/
│   │   ├── ui/                  # shadcn 컴포넌트
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   └── sonner.tsx
│   │   └── board/               # 게시판 커스텀 컴포넌트
│   │       ├── post-form.tsx          # 글 작성/수정 폼
│   │       ├── post-list.tsx          # 글 목록
│   │       ├── search-bar.tsx         # 검색 & 필터
│   │       ├── pagination.tsx         # 페이지네이션
│   │       ├── comment-section.tsx    # 댓글 섹션
│   │       └── delete-post-dialog.tsx # 삭제 확인 다이얼로그
│   └── lib/
│       ├── db.ts        # 데이터베이스 계층 (JSON 파일)
│       ├── password.ts  # 비밀번호 해싱 (scrypt)
│       ├── types.ts     # TypeScript 타입 정의
│       └── utils.ts     # 유틸리티 함수
└── data/
    └── board.json       # 게시물 & 댓글 저장소 (자동 생성)
```

## 🚀 실행 방법

### 1. 설치
```bash
cd DemoBoard
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

### 3. 프로덕션 빌드
```bash
npm run build
npm start
```

## 💡 사용 예시

### 글 작성
1. "글 작성" 버튼 클릭
2. 제목, 내용, 작성자, 카테고리 입력
3. **비밀번호 설정** (수정/삭제 시 필요)
4. "글 등록" 클릭

### 글 수정/삭제
1. 글 상세 페이지에서 "수정" 또는 "삭제" 버튼 클릭
2. 작성 시 설정한 비밀번호 입력
3. 확인

### 검색 & 필터
- **키워드 검색**: 제목, 내용, 작성자에서 검색
- **카테고리 필터**: 드롭다운에서 선택

## 🔒 보안

- **비밀번호 해싱**: scrypt + 솔트를 사용한 안전한 해싱
- **타이밍 안전 검증**: 타이밍 공격 방지
- **서버 액션**: 클라이언트 코드 숨김, 서버에서만 실행

## 📝 카테고리

| 값 | 레이블 |
|---|-------|
| `free` | 자유 |
| `question` | 질문 |
| `info` | 정보 |
| `review` | 후기 |

## 🎨 UI 특징

- **shadcn/ui** 기반의 모던하고 일관된 디자인
- **Tailwind CSS** 유틸리티로 빠른 커스터마이징
- **Sonner 토스트**: 성공/오류 메시지 알림
- **다크 모드**: 브라우저 설정 따라 자동 적용

## 📊 데이터 저장소

기본적으로 `data/board.json` 파일에 저장됩니다:

```json
{
  "nextPostId": 4,
  "nextCommentId": 2,
  "posts": [
    {
      "id": 1,
      "title": "...",
      "content": "...",
      "author": "...",
      "category": "free",
      "passwordHash": "...",
      "views": 42,
      "createdAt": "2026-09-22T...",
      "updatedAt": "2026-09-22T..."
    }
  ],
  "comments": [...]
}
```

## 🔄 Next.js 16 특징 활용

- **Server Components**: 데이터 페칭을 서버에서 처리
- **Server Actions**: 폼 제출과 뮤테이션을 안전하게 처리
- **Dynamic Routes**: `[id]`, `[id]/edit` 동적 라우팅
- **Suspense**: 로딩 상태 관리
- **Revalidation**: 데이터 변경 시 자동 캐시 무효화

## 🚧 향후 개선 사항

- [ ] SQLite/PostgreSQL 데이터베이스 마이그레이션
- [ ] 사용자 인증 & 로그인
- [ ] 게시물 추천/공감 기능
- [ ] 실시간 알림 (WebSocket)
- [ ] 첨부 파일 업로드
- [ ] 마크다운 에디터
- [ ] 태그 시스템

## 📄 라이선스

MIT License

---

**Built with Next.js & shadcn/ui** 🚀
