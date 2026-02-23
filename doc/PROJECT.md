# VocabMaster - 영단어 5단계 학습 서비스

## 프로젝트 개요
중학생 딸을 위한 영단어 학습 웹 서비스.
단어 10개를 입력하면 시스템이 자동으로 데이터를 수집하고, 5단계에 걸쳐 학습을 진행한다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 16 (App Router) |
| 스타일링 | Tailwind CSS 4 |
| 언어 | TypeScript |
| 폰트 | Lexend + Material Symbols |
| 데이터 저장 | localStorage (추후 Supabase 전환 가능) |
| 사전 API | Free Dictionary API (https://dictionaryapi.dev) |
| 패키지매니저 | npm |
| 배포 (예정) | Vercel |

## 학습 단계

| 단계 | 이름 | 설명 | 경로 |
|------|------|------|------|
| Step 0 | 단어 입력 | 영단어 10개 입력 → API 자동 수집 → 한글 뜻 입력 | `/study/input` |
| Step 1 | 노출 및 탐색 | 플래시카드 (단어/발음/뜻/예문), 카드 뒤집기, 발음 재생 | `/study/preview` |
| Step 2 | 뜻 고르기 | 4지선다 객관식 퀴즈 | `/study/quiz` |
| Step 3 | 스펠링 맞히기 | 빈칸 채우기 + 글자 뱅크 + 힌트 | `/study/recall` |
| Step 4 | 문장 완성 | 예문 속 빈칸에 단어 넣기 | `/study/context` |
| Step 5 | 최종 확인 | 오답 단어만 모아서 직접 입력 복습 → 완료 트로피 | `/study/mastery` |

## 프로젝트 구조

```
vocab-app/
├── app/
│   ├── layout.tsx              # 공통 레이아웃 (헤더/네비게이션)
│   ├── page.tsx                # 홈 (대시보드, 학습 이력)
│   ├── globals.css             # Tailwind 테마 (primary: #137fec, Lexend 폰트)
│   └── study/
│       ├── input/page.tsx      # Step 0
│       ├── preview/page.tsx    # Step 1
│       ├── quiz/page.tsx       # Step 2
│       ├── recall/page.tsx     # Step 3
│       ├── context/page.tsx    # Step 4
│       └── mastery/page.tsx    # Step 5
├── lib/
│   ├── storage.ts              # localStorage CRUD (세션, 단어 진도)
│   └── dictionary-api.ts       # Free Dictionary API 연동
├── types/
│   └── index.ts                # WordData, StudySession, WordProgress 등 타입 정의
├── components/                 # (빈 디렉토리, 향후 컴포넌트 분리용)
│   ├── ui/
│   ├── study/
│   └── layout/
└── package.json
```

## 핵심 구현 사항

### 완료된 기능
- [x] Next.js 프로젝트 초기 설정 (TypeScript + Tailwind CSS 4)
- [x] 공통 레이아웃 및 네비게이션
- [x] Step 0: 단어 입력 + Free Dictionary API 자동 수집 + 한글 뜻 입력
- [x] Step 1: 플래시카드 UI (앞뒤 뒤집기, 발음 오디오 재생)
- [x] Step 2: 4지선다 객관식 (정답/오답 피드백)
- [x] Step 3: 스펠링 빈칸 채우기 (글자 뱅크, 힌트 기능)
- [x] Step 4: 문장 빈칸 채우기 (예문 기반)
- [x] Step 5: 오답 복습 퀴즈 + 완료 트로피 화면
- [x] localStorage 기반 세션/진도 저장
- [x] 오답 자동 추적 (단계별 틀린 단어 기록)

### 미구현 (향후 작업)
- [ ] 간격 반복 알고리즘 (Spaced Repetition, 에빙하우스 망각곡선)
- [ ] 게이미피케이션 (콤보 점수, 제한 시간, 스트릭)
- [ ] 대시보드 통계 (학습 이력, 차트)
- [ ] 오답 노트 자동화 (취약 단어장, 다음 세트에 슬쩍 포함)
- [ ] Supabase 연동 (DB 영속화, 사용자 인증)
- [ ] Vercel 배포
- [ ] 모바일 최적화 개선
- [ ] 다크 모드 지원

## 실행 방법

```bash
cd vocab-app
npm install
npm run dev
# http://localhost:3000
```

## 참고 문서
- `guide.md` - 서비스 기획 원본
- `step3.md` - Step 3 UI 목업 (HTML)
- `step5.md` - Step 5 UI 목업 (HTML)
