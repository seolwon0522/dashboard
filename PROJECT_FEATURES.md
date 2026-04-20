# Project Features

현재 프로젝트에 구현되어 있는 기능을 코드 기준으로 정리한 문서입니다.

## 프로젝트 개요

- Redmine REST API를 직접 조회해 운영 현황을 보여주는 대시보드입니다.
- 백엔드는 FastAPI, 프론트엔드는 Next.js App Router 기반으로 구성되어 있습니다.
- 별도 DB 없이 Redmine을 실시간 데이터 소스로 사용합니다.
- 인메모리 TTL 캐시를 사용해 중복 조회를 줄입니다.
- Redmine 연결 설정, 운영 대시보드, 위키 HTML 내보내기 기능이 함께 구현되어 있습니다.

## 구현된 주요 기능

### 1. Redmine 연결 관리

- 현재 Redmine 연결 상태 조회
- API Key 인증 방식 지원
- ID / 비밀번호(Basic) 인증 방식 지원
- 연결 테스트 기능
- 연결 정보 로컬 저장 기능
- 저장된 연결 정보 삭제 기능
- 환경 변수, `config.runtime.json`, `config.json` 순서의 연결 우선순위 지원
- 환경 변수로 주입된 연결 정보는 UI에서 덮어쓰기/삭제 불가

주요 엔드포인트:

- `GET /api/v1/redmine/connection-status`
- `POST /api/v1/redmine/test-connection`
- `POST /api/v1/redmine/save-connection`
- `DELETE /api/v1/redmine/connection`

관련 파일:

- `app/api/v1/redmine.py`
- `app/services/redmine_connection_service.py`
- `app/core/connection_store.py`
- `frontend/src/components/connection/RedmineConnectionSetup.tsx`

### 2. 프로젝트 선택 및 진입 화면

- 앱 진입 시 Redmine 연결 상태를 먼저 확인
- 연결이 준비되지 않았으면 연결 설정 화면 표시
- 연결이 준비되면 프로젝트 선택 화면 표시
- 프로젝트 목록을 단순 이름순이 아니라 위험 우선순위 기준으로 활용
- 최근 방문 프로젝트를 브라우저 로컬 스토리지에 저장

관련 파일:

- `frontend/src/app/page.tsx`
- `frontend/src/components/ProjectSelectView.tsx`
- `frontend/src/components/ProjectSelect.tsx`

### 3. 운영 대시보드 Home

- 프로젝트별 운영 요약 화면
- 활성 이슈, 진행 중, 기한 초과, 이번 주 마감, 정체 이슈, 최근 완료 같은 KPI 제공
- 즉시 조치가 필요한 이슈 큐 제공
- 프로젝트 상태 점수와 흐름 정보 제공
- 최근 동기화 시각 표시
- 수동 새로고침 기능 제공

관련 파일:

- `frontend/src/app/dashboard/[projectId]/page.tsx`
- `frontend/src/components/overview/HomeFocusCard.tsx`
- `frontend/src/components/overview/HomeActionQueue.tsx`
- `frontend/src/lib/dashboard/model.ts`
- `frontend/src/lib/dashboard/scoring.ts`

### 4. Issues 작업 화면

- 운영용 이슈 목록 조회
- preset 기반 필터링 지원
- 담당자, 상태, 검색, 정렬 등 탐색 기능
- 모바일 카드 / 데스크톱 테이블 레이아웃 지원
- 이슈 선택 시 내부 상세 드로어 표시
- URL query를 통해 현재 작업 상태 유지

이슈 상세 화면에서 제공하는 정보:

- 기본 메타데이터
- 설명 본문
- 첨부 파일
- 저널(변경 이력)
- 관련 이슈(parent/child/relation)

주요 엔드포인트:

- `GET /api/v1/dashboard/issues`
- `GET /api/v1/dashboard/issues/{issue_id}`
- `GET /api/v1/dashboard/issues/overdue`

관련 파일:

- `frontend/src/app/dashboard/[projectId]/issues/page.tsx`
- `frontend/src/components/IssueExplorer.tsx`
- `frontend/src/components/IssueDetailDrawer.tsx`
- `frontend/src/components/issues/IssueSplitView.tsx`
- `app/services/issue_service.py`

### 5. Team 분석 화면

- 담당자별 workload 집계
- 미할당 이슈 포함 조회
- 담당자별 위험 신호, 작업량, 개입 우선순위 표시
- 담당자 패턴/인사이트 제공
- 담당자별 이슈 상세 목록 조회

주요 엔드포인트:

- `GET /api/v1/dashboard/workload`
- `GET /api/v1/dashboard/workload/member`

관련 파일:

- `frontend/src/app/dashboard/[projectId]/team/page.tsx`
- `frontend/src/components/team/TeamOverviewSection.tsx`
- `frontend/src/components/TeamCapacityPanel.tsx`
- `frontend/src/components/AssigneeInsightsPanel.tsx`
- `app/services/workload_service.py`

### 6. Settings 기준 조정 화면

- 대시보드 임계값 설정
- Conservative / Default / Relaxed preset 적용
- 점수 가중치 조정
- 사용자 설정을 localStorage에 저장
- 설정값 변경 시 대시보드 계산 결과 재적용

관련 파일:

- `frontend/src/app/dashboard/[projectId]/settings/page.tsx`
- `frontend/src/components/settings/SettingsOverviewSection.tsx`
- `frontend/src/components/settings/ThresholdSettingsForm.tsx`
- `frontend/src/lib/dashboard/settings.ts`
- `frontend/src/lib/dashboard/thresholds.ts`

### 7. 프로젝트 공통 Shell

- Home / Issues / Team / Settings 공통 네비게이션
- 프로젝트 전환 드롭다운
- 마지막 동기화 시간 표시
- 공통 데이터 로딩 및 refresh 처리
- 위키 HTML 내보내기 버튼 및 진행 상태 표시

관련 파일:

- `frontend/src/components/shell/DashboardProjectLayout.tsx`
- `frontend/src/hooks/useDashboardProjectData.ts`

### 8. Redmine 자산 프록시

- Redmine 첨부 파일/이미지 프록시 조회
- 현재 연결 인증 정보를 사용해 보호 리소스 접근
- 동일 Redmine origin만 허용

주요 엔드포인트:

- `GET /api/v1/dashboard/assets`

관련 파일:

- `app/api/v1/dashboard.py`
- `app/client/redmine_client.py`
- `frontend/src/lib/redmineAssets.ts`

### 9. 위키 HTML 내보내기

- 프로젝트 Redmine Wiki를 단일 HTML 파일로 export
- 작업 생성 후 비동기 백그라운드 처리
- 진행률, 현재 단계, 최근 로그 조회 가능
- 완료 시 브라우저에서 자동 다운로드 처리
- 다운로드 완료 여부 추적

주요 엔드포인트:

- `POST /api/v1/wiki-export/jobs`
- `GET /api/v1/wiki-export/jobs/{job_id}`
- `GET /api/v1/wiki-export/jobs/{job_id}/download`

관련 파일:

- `wikiexport/api_app.py`
- `wikiexport/wiki_export_service.py`
- `frontend/src/lib/api.ts`
- `frontend/src/components/shell/DashboardProjectLayout.tsx`

### 10. 별도 위키 익스포트 도구

대시보드와 별도로, `wikiexport/` 폴더에 독립 실행용 위키 내보내기 도구도 포함되어 있습니다.

- GUI 실행 방식 지원
- CLI 실행 방식 지원
- `config.json` 기반 설정
- 이미지 로컬 다운로드 및 링크 재작성
- 단일 HTML 결과물 생성

관련 파일:

- `wikiexport/gui_app.py`
- `wikiexport/mirror_wiki.py`
- `wikiexport/README.md`

## 백엔드 구현 범위

- FastAPI 앱 초기화 및 공통 예외 처리
- Redmine 비동기 HTTP 클라이언트
- 프로젝트 목록 집계 서비스
- 이슈 요약/상세/기한 초과 집계 서비스
- 담당자 workload 집계 서비스
- 응답 스키마(Pydantic) 정의
- 인메모리 TTL 캐시

핵심 파일:

- `app/main.py`
- `app/client/redmine_client.py`
- `app/services/issue_service.py`
- `app/services/project_service.py`
- `app/services/workload_service.py`
- `app/schemas/dashboard.py`
- `app/schemas/redmine_connection.py`

## 프론트엔드 구현 범위

- App Router 기반 라우팅
- API fetch 래퍼
- 대시보드 모델 변환 레이어
- 운영 점수/위험 신호 계산
- 차트 및 카드형 시각화
- 이슈 상세 드로어
- 연결 설정 UI
- 프로젝트/화면 간 공통 shell

핵심 파일:

- `frontend/src/app/page.tsx`
- `frontend/src/app/dashboard/[projectId]/layout.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/dashboard/model.ts`
- `frontend/src/lib/dashboard/scoring.ts`
- `frontend/src/lib/dashboard/insights.ts`

## 현재 확인 가능한 API 목록

### FastAPI 대시보드 API

- `GET /health`
- `GET /api/v1/dashboard/projects`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/issues`
- `GET /api/v1/dashboard/issues/{issue_id}`
- `GET /api/v1/dashboard/issues/overdue`
- `GET /api/v1/dashboard/workload`
- `GET /api/v1/dashboard/workload/member`
- `GET /api/v1/dashboard/assets`
- `GET /api/v1/redmine/connection-status`
- `POST /api/v1/redmine/test-connection`
- `POST /api/v1/redmine/save-connection`
- `DELETE /api/v1/redmine/connection`

### Wiki Export API

- `GET /health`
- `POST /api/v1/wiki-export/jobs`
- `GET /api/v1/wiki-export/jobs/{job_id}`
- `GET /api/v1/wiki-export/jobs/{job_id}/download`

## 설정 및 운영 방식

- 프론트엔드 `:3000`은 rewrite를 통해 백엔드 API로 프록시
- 기본 백엔드 주소는 `http://localhost:8000`
- 위키 export API 기본 주소는 `http://localhost:8010`
- Redmine 연결 정보는 환경 변수 또는 로컬 설정 파일에서 로드
- 캐시는 프로세스 메모리에 저장되며 서버 재시작 시 초기화됨

관련 파일:

- `frontend/next.config.mjs`
- `config.json`
- `config.runtime.json`
- `wikiexport/config.json`

## 현재 구조적 특징

- DB 없이 운영 가능한 경량 구조
- Redmine을 단일 진실 소스로 사용
- 백엔드에서 1차 가공, 프론트엔드에서 운영 관점 계산/표현
- 단일 프로젝트 화면이 아니라 프로젝트별 운영 의사결정 화면에 초점
- 위키 문서 export 기능이 대시보드와 별도 도구 양쪽에 구현되어 있음

## 현재 제한 사항

- 장기 히스토리 저장용 DB가 없음
- 캐시가 프로세스 단위라 멀티 워커 환경에서 공유되지 않음
- 장기 MTTR, 완전한 번다운 같은 히스토리 기반 지표는 제한적임
- Redmine 서버 연결 상태와 응답 품질에 직접 영향받음

## 참고 문서

- 전체 구조 및 실행 방법: `README.md`
- 위키 export 상세 사용법: `wikiexport/README.md`
