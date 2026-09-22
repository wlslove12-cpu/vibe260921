# 🚀 빠른 시작 가이드

## 1️⃣ 설치 & 실행 (30초)

```bash
cd DemoBoard
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 열기 ✨

## 2️⃣ 첫 글 작성해보기

### 단계별 가이드
1. **"글 작성" 버튼** 클릭
2. 아래 정보 입력:
   - 📝 **카테고리**: "자유" 선택
   - 📋 **제목**: "안녕하세요"
   - 📄 **내용**: "DemoBoard 테스트 중입니다"
   - 👤 **작성자**: "테스터"
   - 🔐 **비밀번호**: "1234" (수정/삭제할 때 필요)
   - 🔐 **비밀번호 확인**: "1234"
3. **"글 등록"** 클릭

### 💡 팁
- 비밀번호를 잊지 마세요!
- 제목과 내용은 2글자 이상이어야 합니다.

## 3️⃣ 글 검색 & 필터링

### 키워드 검색
- 검색창에 키워드 입력 후 **Enter** 키
- 제목, 내용, 작성자에서 검색됩니다

### 카테고리 필터
- 드롭다운에서 카테고리 선택
- 자동으로 필터링됩니다

## 4️⃣ 댓글 달기

1. 글 상세 페이지 하단의 **"댓글 달기"** 섹션
2. 이름, 비밀번호, 내용 입력
3. **"댓글 등록"** 클릭

## 5️⃣ 글 수정/삭제

### 수정하기
1. 글 상세 페이지에서 **"수정"** 버튼
2. 작성 시 입력한 **비밀번호** 입력
3. 내용 수정 후 **"글 수정"** 클릭

### 삭제하기
1. 글 상세 페이지에서 **"삭제"** 버튼
2. 작성 시 입력한 **비밀번호** 입력
3. **"삭제"** 클릭 확인

## 🧪 테스트 데이터

앱 처음 실행 시 3개의 샘플 글이 자동 생성됩니다:

| 글 | 작성자 | 비밀번호 |
|---|-------|--------|
| Welcome 🎉 | 관리자 | 1234 |
| shadcn/ui 질문 | 새내기 | 1234 |
| App Router 후기 | 개발자K | 1234 |

(모두 비밀번호: `1234`)

## 📱 반응형 디자인

- **데스크톱**: 최적화된 레이아웃
- **태블릿**: 조정된 간격과 폰트
- **모바일**: 세로 레이아웃, 터치 친화적

## 🎨 다크 모드

- 시스템 다크 모드 설정에 자동 반응
- Mac/Linux: `prefers-color-scheme` 인식
- Windows: 시스템 테마 따름

## 🐛 문제 해결

### 포트 3000이 이미 사용 중인 경우
```bash
# 다른 포트에서 실행
PORT=3001 npm run dev
```

### 데이터 초기화하려면
```bash
# data/board.json 파일 삭제
rm data/board.json
# 앱 재시작하면 새로운 샘플 데이터로 초기화됨
```

### 빌드 에러
```bash
# 캐시 제거 후 재시작
rm -rf .next node_modules
npm install
npm run dev
```

## 📚 더 알아보기

- [Next.js 문서](https://nextjs.org/docs)
- [shadcn/ui 컴포넌트](https://shadcn.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)

## 🎯 다음 단계

### 개발자라면?
- `src/lib/db.ts`에서 데이터 로직 확인
- `src/components/board/`에서 컴포넌트 커스터마이징
- `src/app/actions.ts`에서 서버 액션 수정

### 배포하려면?
- [Vercel](https://vercel.com/) 추천 (Next.js 제작사)
- [Netlify](https://netlify.com/), [Railway](https://railway.app/) 등도 가능

---

**행운을 빕니다! 🚀**
