마스터 워드 배틀 (Master Words Battle)

Context

기존 5단계 학습과 별도로, 경쟁/성취 요소를 더한 "배틀" 모드 추가.  
 한글 뜻+발음을 보고 영어 단어를 입력하는 타임어택 방식.  
 개인 점수가 소속(학교/그룹) 점수에 자동 합산되어 그룹 랭킹 형성.

Supabase 테이블

CREATE TABLE battle_scores (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
user_id UUID NOT NULL,
grade_tier TEXT NOT NULL CHECK (grade_tier IN ('all', 'high_below', 'middle_only')),
score INTEGER NOT NULL DEFAULT 0,
max_combo INTEGER NOT NULL DEFAULT 0,
correct_count INTEGER NOT NULL DEFAULT 0,
total_count INTEGER NOT NULL DEFAULT 0,
time_seconds INTEGER NOT NULL DEFAULT 0,
created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_battle_scores_ranking ON battle_scores (grade_tier, score DESC);
CREATE INDEX idx_battle_scores_user ON battle_scores (user_id, grade_tier);

ALTER TABLE battle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read" ON battle_scores FOR SELECT USING (true);
CREATE POLICY "Users insert own" ON battle_scores FOR INSERT WITH CHECK (auth.uid() = user_id);

점수 로직

한 문제당:

- 10초 내 정답: +10점
- 10초 초과 또는 오답: 0점, 콤보 리셋
- 5초 내 정답: 콤보 유지 → +combo 보너스점
- 5초~10초 정답: +10점이지만 콤보 리셋

콤보 예시 (연속 5초 내 정답):
Q1: 10점 (총 10)
Q2: 10 + combo1 = 11 (총 21)
Q3: 10 + combo2 = 12 (총 33)
Q4: 10 + combo3 = 13 (총 46)
Q5: 10 + combo4 = 14 (총 60)

그룹 점수 = 소속 멤버들의 각자 최고점수 합산
재도전 시 기존 최고점수보다 낮으면 이전 기록 유지

등급 구분 (grade_tier)

- all (통합): middle + high + normal 전체 단어
- high_below (고등이하): middle + high
- middle_only (중등이하): middle만

→ word_group_categories.grade 필드 기준 필터링

신규 파일

1.  lib/battle.ts — 데이터 접근 + 타입

- GradeTier, BattleWord, BattleRankEntry, GroupRankEntry 타입
- fetchBattleWords(tier): 해당 등급 카테고리의 전체 단어 수집, 중복 제거, 셔플
- submitBattleScore(...): 점수 저장
- getIndividualRanking(tier): 개인별 최고점수 랭킹 (닉네임+그룹 포함)
- getGroupRanking(tier): 그룹별 합산 랭킹
- getMyBestScore(userId, tier): 내 최고점수

2.  app/battle/page.tsx — 등급 선택 화면

- 로그인 필수 (미로그인 시 /auth 리다이렉트)
- 3개 등급 카드: 통합 / 고등이하 / 중등이하 (각 단어 수 표시)
- 선택 시 → /battle/play?tier=xxx

3.  app/battle/play/page.tsx — 배틀 퀴즈

- 한글 뜻 + 발음기호 표시, 오디오 자동 재생
- 10초 카운트다운 타이머 (원형 또는 바)
- 영어 단어 입력 (Enter로 제출)
- O/X 오버레이 + 콤보 표시
- 완료 시: 점수/정답수/최대콤보/시간 → Supabase 저장
- 버튼: [다시 도전] [랭킹 보기]

4.  app/battle/rank/page.tsx — 배틀 랭킹

- 등급 선택 탭 (통합/고등이하/중등이하)
- 2탭: 개인 랭킹 | 그룹 랭킹
- 개인: 순위, 닉네임(소속), 최고점수
- 그룹: 순위, 그룹명, 합산점수, 참여자수
- 현재 사용자/그룹 하이라이트

수정 파일

app/layout.tsx — 내비게이션

- 데스크톱 헤더: "배틀" 링크 추가
- 모바일 탭바: "배틀" 탭 추가 (swords 아이콘)

app/page.tsx — 대시보드

- 사이드바에 배틀 배너 카드 추가 (빨강~주황 그라데이션)

재사용하는 기존 코드

- lib/admin.ts: fetchAllCategoryMetas(), Grade, GRADE_LABELS
- lib/admin.ts: fetchGroupsByCategory()로 단어 가져오기
- lib/dictionary-api.ts: getAudioUrl() 발음 재생
- lib/sound.ts: playCorrectSound(), playWrongSound()
- app/leaderboard/page.tsx: 랭킹 UI 패턴 참조

검증

- npm run build 성공
- 배틀 플레이: 타이머, 점수, 콤보 동작 확인
- 랭킹: 개인/그룹 정렬, 최고점수만 반영 확인
- 커밋 + 푸시 + Vercel 배포

  구현 요약

  신규 파일 4개:
  - lib/battle.ts — 타입 정의 + 단어 수집/점수 저장/랭킹 조회
  - app/battle/page.tsx — 등급 선택 (통합/고등이하/중등이하, 단어 수 + 최고점수 표시)
  - app/battle/play/page.tsx — 배틀 퀴즈 (20문제, 10초 타이머, 5초 내 정답 시 콤보, O/X 오버레이, 결과 화면)
  - app/battle/rank/page.tsx — 등급별 개인/그룹 랭킹 (내 순위/내 그룹 하이라이트)  


  수정 파일 2개:
  - app/layout.tsx — 헤더 + 모바일 탭바에 "배틀" 추가
  - app/page.tsx — 사이드바에 빨강~주황 그라데이션 배틀 배너
