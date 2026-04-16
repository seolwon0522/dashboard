# Redmine Operations Dashboard

Redmine REST API를 직접 조회해 운영 현황을 보여주는 경량 풀스택 대시보드입니다.

- FastAPI 백엔드와 Next.js 프론트엔드로 구성됩니다.
- 별도 DB나 Redis 없이 인메모리 TTL 캐시만 사용합니다.
- Redmine 연결은 환경 변수, 레거시 `config.json`, 로컬 `config.runtime.json`, 첫 진입 UI 설정 흐름을 모두 지원합니다.
- 기존 Redmine API 연동을 유지하면서, 단순 이슈 뷰어가 아니라 관리 판단용 운영 대시보드에 맞춰 리팩터링되어 있습니다.

## 핵심 방향

이 프로젝트는 다음 질문에 빠르게 답하는 것을 목표로 합니다.

- 지금 무엇이 위험한가
- 이번 주 무엇을 챙겨야 하는가
- 어떤 이슈가 오래 멈춰 있거나 지연되고 있는가
- 누가 과부하 상태인가
- 프로젝트 흐름이 나아지고 있는가, 악화되고 있는가

현재 UI는 다음 흐름을 중심으로 구성됩니다.

1. Redmine 연결 확인 / 설정 화면
2. 위험 우선순위 기반 프로젝트 선택 화면
3. Home 요약과 즉시 조치 큐
4. Issues 작업 화면 + 내부 상세 드로어
5. Team 개입 우선순위와 작업 패턴
6. Settings 임계값 / 가중치 조정

## 기술 스택

### 백엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Python | 3.12+ | 런타임 |
| FastAPI | 0.115.0 | API 서버 |
| Uvicorn | 0.30.0 | ASGI 실행 |
| httpx | 0.27.0 | Redmine API 비동기 호출 |
| textile | 4.0.3 | Redmine Textile 본문 HTML 변환 |
| Pydantic | FastAPI 내장 | 응답 스키마 검증 |

### 프론트엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Next.js | 14.2.0 | App Router 기반 UI |
| React | 18.3+ | 컴포넌트 렌더링 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 3.4+ | UI 스타일링 |
| DOMPurify | 3.3.3 | Rich HTML sanitize |
| marked | 17.0.6 | markdown fallback 렌더링 |

## 현재 구조

```text
dashboard/
├── config.json
├── config.runtime.json
├── requirements.txt
├── README.md
│
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       ├── dashboard.py
│   │       ├── deps.py
│   │       ├── redmine.py
│   │       └── router.py
│   ├── client/
│   │   └── redmine_client.py
│   ├── core/
│   │   ├── config.py
│   │   └── connection_store.py
│   ├── schemas/
│   │   ├── dashboard.py
│   │   └── redmine_connection.py
│   └── services/
│       ├── issue_service.py
│       ├── project_service.py
│       ├── redmine_connection_service.py
│       ├── utils.py
│       └── workload_service.py
│
└── frontend/
    ├── next.config.mjs
    ├── package.json
    ├── tailwind.config.ts
  └── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── dashboard/
    │       └── [projectId]/
    │           ├── layout.tsx
    │           ├── page.tsx
    │           ├── issues/page.tsx
    │           ├── team/page.tsx
    │           └── settings/page.tsx
    ├── components/
    │   ├── AssigneeInsightsPanel.tsx
    │   ├── Badge.tsx
    │   ├── FilterChips.tsx
    │   ├── IssueDetailDrawer.tsx
    │   ├── IssueExplorer.tsx
    │   ├── IssueRichContent.tsx
    │   ├── ProjectSelect.tsx
    │   ├── ProjectSelectView.tsx
    │   ├── SectionCard.tsx
    │   ├── TeamCapacityPanel.tsx
    │   ├── charts/
    │   │   ├── ComparisonTrendChart.tsx
    │   │   ├── GroupedWorkloadChart.tsx
    │   │   └── HorizontalBarChart.tsx
    │   ├── connection/RedmineConnectionSetup.tsx
    │   ├── issues/IssueSplitView.tsx
    │   ├── overview/HomeActionQueue.tsx
    │   ├── overview/HomeFocusCard.tsx
    │   ├── settings/SettingsOverviewSection.tsx
    │   ├── settings/ThresholdSettingsForm.tsx
    │   ├── shell/DashboardProjectLayout.tsx
    │   └── team/TeamOverviewSection.tsx
    ├── hooks/
    │   └── useDashboardProjectData.ts
    ├── lib/
    │   ├── api.ts
    │   ├── dashboard.ts
    │   ├── dashboard/
    │   │   ├── date.ts
    │   │   ├── insights.ts
    │   │   ├── model.ts
    │   │   ├── scoring.ts
    │   │   ├── settings.ts
    │   │   └── thresholds.ts
    │   ├── labels.ts
    │   └── redmineAssets.ts
    └── types/
        ├── dashboard.ts
        ├── dashboard-derived.ts
        └── redmine-connection.ts
```

## 아키텍처 요약

### 백엔드

- `client/`: Redmine HTTP 호출 전담
- `services/`: 요약, 위험 신호, aging, 관련 이슈, workload 집계
- `schemas/`: 프론트엔드가 그대로 소비할 응답 모델 정의
- `core/`: 설정과 인메모리 TTL 캐시
- `api/`: FastAPI 라우팅과 의존성 주입

핵심 원칙은 단순합니다.

- Redmine을 실시간 소스로 사용
- DB를 추가하지 않음
- 공유 캐시로 중복 API 호출 억제
- 프론트엔드에서 바로 사용할 수 있는 형태로 최소 가공

### 프론트엔드

프론트엔드는 루트(`/`)에서 먼저 Redmine 연결 상태를 확인하고, 연결이 준비되면 프로젝트 선택 화면으로 진입합니다. 이후 project shell이 공통 데이터 로딩과 설정 상태를 관리하고, 각 route가 화면별 상태만 소유합니다. 실제 운영 지표 계산은 `frontend/src/lib/dashboard.ts`와 `frontend/src/lib/dashboard/` 하위 모듈에 모아둡니다.

이 계층이 담당하는 일:

- 공통 프로젝트 데이터 fetch / refresh
- Home, Issues, Team, Settings route 간 공통 shell/context 제공
- KPI/상태 스냅샷/조치 큐/팀 인사이트/상태 점수 계산
- 임계값 설정의 localStorage 저장 및 재계산
- 이슈 탐색기 preset / signal 계산

즉, UI 컴포넌트는 되도록 표시만 담당하고, 계산 로직은 변환 레이어로 모읍니다.

현재 route 구조:

- `/`: Redmine 연결 확인 또는 프로젝트 선택
- `/dashboard/[projectId]`: action-first Home
- `/dashboard/[projectId]/issues`: 이슈 작업 화면
- `/dashboard/[projectId]/team`: 담당자/팀 분석
- `/dashboard/[projectId]/settings`: 임계값과 점수 기준 설정

Redmine 연결 소스 우선순위:

1. 환경 변수 (`REDMINE_*`)
2. 로컬 `config.runtime.json`
3. 레거시 `config.json`

환경 변수로 연결을 주입한 경우 UI에서는 값을 덮어쓰거나 삭제할 수 없습니다. 로컬 저장 흐름을 쓰는 경우 첫 진입 화면에서 테스트 후 저장한 값이 `config.runtime.json`에 기록됩니다.

## 현재 화면 구조

### 1. 연결 / 진입 화면

루트 화면은 먼저 Redmine 연결 상태를 확인합니다.

- 연결이 없거나 깨졌으면 `RedmineConnectionSetup` 표시
- 연결이 정상이면 `ProjectSelectView` 표시
- 프로젝트 목록은 open issue 수만이 아니라 `risk_score`, `risk_level`, `primary_reason` 기준으로 정렬

### 2. Home

Home은 장식형 대시보드가 아니라 “지금 무엇을 먼저 봐야 하는가”를 바로 정하는 화면입니다.

- 오늘 운영 포커스
- 즉시 조치 큐
- 원인 빠른 확인
- 필요할 때만 펼치는 상세 흐름

### 3. Issues

Issues는 원시 테이블이 아니라 운영용 작업 화면입니다.

- 상단 처리 기준 브리핑
- 우선 큐 분포 차트
- attention 기준 정렬
- 모바일 카드 / 데스크톱 테이블 이중 레이아웃
- URL query 기반 preset / issueId 상태 유지
- 내부 상세 드로어에서 운영 요약 우선 노출

### 4. Team

Team은 리소스 현황보다 “어디에 먼저 개입할지”에 집중합니다.

- 팀 관리 브리핑
- 빠른 개입 대상
- 담당자별 작업 여력
- 담당자 패턴 / 권장 액션 / 근거 이슈

### 5. Settings

Settings는 프리셋 선택 후 세부 조정으로 이어지는 흐름입니다.

- 현재 기준 설명
- 임계값 그룹별 조정
- 고급 점수 가중치 토글
- 변경 영향 범위 요약

## 현재 대시보드 정보 구조

### 1. 운영 KPI

상단 KPI는 장식용 숫자가 아니라 바로 필터로 연결되는 운영 신호입니다.

- 활성 이슈
- 진행 중
- 기한 초과
- 이번 주 마감
- 정체 이슈
- 최근 완료

### 2. 즉시 조치 필요

가운데 영역은 빈 공간 대신 다음 큐를 보여줍니다.

- 기한 초과 작업
- 이번 주 마감
- 정체 이슈
- 높은 우선순위
- 미할당 작업

각 큐는 0건이어도 의도된 빈 상태를 보여줍니다.

### 3. 팀 작업 여력

담당자별로 다음 신호를 압축 표시합니다.

- 활성 건수
- 진행 중 건수
- 높은 우선순위 건수
- 임박 일정 건수
- 지연 건수
- 정체 건수
- 최근 완료 건수

### 4. 프로젝트 상태

프로젝트 상태 패널은 다음을 요약합니다.

- 상태 점수
- 완료율
- 평균 cycle days
- 최근 생성 vs 최근 완료
- 기한 초과 / 미할당 현황
- aging bucket
- 최근 6주 흐름

### 5. 이슈 탐색기

이슈 탐색기는 원시 Redmine 테이블이 아니라 운영용 작업 화면입니다.

- preset 필터
- 검색
- 정렬
- 위험 badge
- 상대적 업데이트 시각
- 진행률 표시
- 행 클릭 시 내부 상세 드로어

## 데이터 흐름

```text
Browser
  -> Next.js frontend
  -> /api/v1/*
  -> FastAPI
  -> service layer
  -> TTL cache hit or RedmineClient
  -> Redmine REST API
  -> normalized JSON response
  -> frontend transformation layer
  -> dashboard UI
```

### 캐시 전략

- 캐시 저장소: 프로세스 내부 TTL 캐시
- 주요 공유 키: `issues:{project_id}`
- `IssueService`와 `WorkloadService`가 동일 캐시를 재사용
- TTL 만료 전에는 Redmine 재호출 없이 응답

현재 구조는 가볍고 유지보수는 쉽지만, 멀티 워커 환경에서는 캐시가 프로세스별로 분리됩니다.

## 주요 백엔드 API

### 기본 라우트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/health` | 헬스체크 |
| `GET` | `/api/v1/dashboard/projects` | 프로젝트 목록 + open 이슈 수 |
| `GET` | `/api/v1/dashboard/summary` | 요약 지표 |
| `GET` | `/api/v1/dashboard/issues` | 운영용 이슈 목록 |
| `GET` | `/api/v1/dashboard/issues/{issue_id}` | 이슈 상세 + 저널 + 첨부 + 관련 이슈 |
| `GET` | `/api/v1/dashboard/issues/overdue` | 기한 초과 목록 |
| `GET` | `/api/v1/dashboard/workload` | 담당자별 workload 집계 |
| `GET` | `/api/v1/dashboard/workload/member` | 담당자별 이슈 목록 |
| `GET` | `/api/v1/dashboard/assets` | Redmine 첨부/이미지 프록시 |
| `GET` | `/api/v1/redmine/connection-status` | 현재 Redmine 연결 상태 조회 |
| `POST` | `/api/v1/redmine/test-connection` | 입력한 연결 정보 테스트 |
| `POST` | `/api/v1/redmine/save-connection` | 연결 정보 저장 |
| `DELETE` | `/api/v1/redmine/connection` | 로컬 저장 연결 삭제 |

### `GET /api/v1/dashboard/issues`

현재 프론트엔드가 가장 많이 활용하는 엔드포인트입니다.

포함 필드 예시:

- `status_group`
- `assigned_to_id`
- `author`
- `tracker`
- `created_on`
- `updated_on`
- `done_ratio`
- `is_overdue`
- `days_overdue`
- `is_due_soon`
- `days_until_due`
- `is_stale`
- `days_since_update`

즉, 프론트엔드는 별도 DB 없이도 위험/정체/임박/흐름 판단이 가능합니다.

### `GET /api/v1/dashboard/issues/{issue_id}`

이슈 상세 응답은 내부 드로어를 위해 확장되어 있습니다.

- 기본 메타데이터
- 본문 HTML
- attachments
- journals
- related_issues

`related_issues`는 parent, child, relation 정보를 한 번에 정규화해 제공합니다.

## 실행 방법

### 1. 의존성 설치

백엔드:

```bash
pip install -r requirements.txt
```

프론트엔드:

```bash
cd frontend
npm install
```

### 2. 대시보드 기본 설정 준비

`config.json`에는 최소한 `dashboard` 섹션이 필요합니다. Redmine 연결 정보는 여기 넣어도 되지만, 이제는 필수가 아닙니다.

예시:

```json
{
  "dashboard": {
    "default_project": "your-project-identifier",
    "include_subprojects": false,
    "cache_ttl_seconds": 300,
    "status_groups": {
      "open": [1, 2],
      "in_progress": [3, 4],
      "closed": [5, 6, 7]
    },
    "overdue_rule": {
      "field": "due_date",
      "exclude_status_groups": ["closed"]
    }
  }
}
```

### 3. Redmine 연결 준비

연결 정보는 아래 세 방식 중 하나로 준비할 수 있습니다.

#### 옵션 A. 환경 변수로 주입

운영 환경에서 권장합니다.

```bash
REDMINE_BASE_URL=https://your-redmine-host
REDMINE_AUTH_TYPE=api_key
REDMINE_API_KEY=your_redmine_api_key
```

또는 Basic 인증:

```bash
REDMINE_BASE_URL=https://your-redmine-host
REDMINE_AUTH_TYPE=basic
REDMINE_USERNAME=your_username
REDMINE_PASSWORD=your_password
```

#### 옵션 B. `config.json`에 레거시 기본값 제공

개발 편의용으로만 권장합니다.

```json
{
  "redmine": {
    "base_url": "https://your-redmine-host",
    "auth_type": "api_key",
    "api_key": "your_redmine_api_key",
    "timeout": 30,
    "retry_attempts": 3,
    "page_size": 100
  },
  "dashboard": {}
}
```

#### 옵션 C. 첫 진입 UI에서 저장

아무 연결도 주입하지 않은 상태로 서버를 띄우면 `/`에서 연결 설정 화면이 열립니다.

- Base URL 입력
- 인증 방식 선택 (`api_key` 또는 `basic`)
- 연결 테스트
- 저장

저장된 값은 로컬 전용 `config.runtime.json`에 기록되며 `.gitignore`로 제외됩니다.

### 4. 백엔드 실행

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

운영에서는 단일 워커를 권장합니다.

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 5. 프론트엔드 실행

```bash
cd frontend
npm run dev
```

기본 접속 주소:

- 프론트엔드: `http://localhost:3000`
- 백엔드: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### 6. 프론트엔드 프록시

`frontend/next.config.mjs`는 `/api/v1/*` 요청을 백엔드로 rewrite합니다.

기본값:

- `http://localhost:8000`

필요하면 환경변수로 변경할 수 있습니다.

```bash
API_BASE_URL=http://your-backend-host:8000
```

## 프론트엔드 컴포넌트 맵

| 파일 | 역할 |
|---|---|
| `shell/DashboardProjectLayout.tsx` | 프로젝트 공통 shell, nav, settings/context |
| `connection/RedmineConnectionSetup.tsx` | Redmine 연결 테스트 / 저장 / 삭제 UI |
| `ProjectSelectView.tsx` | 연결 후 프로젝트 진입 화면 |
| `overview/HomeFocusCard.tsx` | Home 상단 focus 카드 |
| `overview/HomeActionQueue.tsx` | Home 즉시 조치 큐 |
| `issues/IssueSplitView.tsx` | Issues route 상태와 상세 드로어 연결 |
| `team/TeamOverviewSection.tsx` | Team route 상태와 팀 분석 조합 |
| `settings/SettingsOverviewSection.tsx` | Settings route 래퍼 |
| `settings/ThresholdSettingsForm.tsx` | 임계값/가중치 폼 본체 |
| `TeamCapacityPanel.tsx` | 담당자별 압축 workload |
| `AssigneeInsightsPanel.tsx` | 담당자 성향 태그와 근거 패널 |
| `IssueExplorer.tsx` | 운영용 이슈 탐색기 |
| `IssueDetailDrawer.tsx` | 내부 상세 드로어 |
| `IssueRichContent.tsx` | Redmine 본문/메모 렌더링 |
| `FilterChips.tsx` | 활성 필터 표시와 제거 |
| `Badge.tsx` / `SectionCard.tsx` | 재사용 UI 프리미티브 |
| `charts/*` | Home / Issues / Team 비교 차트 |

## 운영 신호 계산 기준

기본 계산 기준은 백엔드와 프론트엔드에서 함께 사용됩니다.

- `due soon`: 7일 이내 마감
- `stale`: 7일 이상 업데이트 없음
- `closed recently`: 최근 7일 내 완료
- `health score`: overdue, stale, unassigned, recent flow balance 조합
- `capacity band`: risk score 기반으로 안정 / 주의 / 과부하 분류
- `project list risk`: overdue, stale, unassigned, high priority, due soon, open volume 조합

이 기준은 `frontend/src/lib/dashboard/`와 `app/services/` 하위 모듈에서 조정할 수 있습니다.

## 현재 제한 사항

### 데이터 소스 한계

DB가 없기 때문에 장기 히스토리 기반 지표는 제한적입니다.

- 장기 trend 저장 불가
- 재시작 시 캐시 소멸
- 멀티 워커 캐시 공유 불가

### Redmine API 한계

기본 Redmine API만으로는 다음 항목이 정확히 계산되기 어렵습니다.

- 장기 MTTR
- 완전한 번다운 차트
- 히스토리 기반 개인 생산성

현재는 실시간 운영 판단에 필요한 수준까지만 가공합니다.

## 유지보수 원칙

- Redmine API 연동은 `client/`에 고정
- 집계와 판단 로직은 `services/`와 `frontend/src/lib/dashboard.ts`에 집중
- UI 컴포넌트는 계산보다 표시를 우선
- 불필요한 인프라 추가 없이 현재 구조를 계속 확장 가능하게 유지

## 보안 및 운영 메모

- `config.json`과 `config.runtime.json`에는 민감한 Redmine 인증 정보가 들어갈 수 있습니다.
- 실제 운영에서는 가능하면 환경 변수 주입을 우선 사용하세요.
- `config.runtime.json`은 로컬 전용 파일이며 `.gitignore`에 포함되어 있습니다.
- 환경 변수로 관리된 연결은 UI에서 덮어쓰거나 삭제할 수 없습니다.
- `assets` 프록시는 동일 Redmine origin만 허용하도록 구현되어 있습니다.

## 현재 버전 메모

이번 리팩터링에서 반영된 핵심 변경:

- 모니터링형 화면을 관리형 운영 대시보드로 재구성
- Redmine 연결 상태 확인 / 저장 / 삭제 UI 추가
- Redmine 인증을 API 키와 ID/비밀번호 방식 모두 지원하도록 확장
- 프로젝트 선택 화면을 위험 우선순위 기반 진입 화면으로 재구성
- KPI를 운영 신호 중심으로 교체
- 가운데 영역을 즉시 조치 큐로 대체
- workload를 담당자 위험 신호 중심으로 압축
- 이슈 목록을 이슈 탐색기로 개편
- 내부 상세 드로어에 관련 이슈/변경 이력/첨부 강화
- Issues / Team / Settings를 더 밝고 단순한 제품형 UI로 재정리
- 프론트엔드 변환 레이어를 분리해 로직과 표시를 명확히 구분

## 개발 확인 명령

프론트엔드 빌드 검증:

```bash
cd frontend
npm run build
```

백엔드 기본 실행 검증:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```