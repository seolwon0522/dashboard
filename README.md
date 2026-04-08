# Redmine Operations Dashboard

Redmine REST API를 직접 조회해 운영 현황을 보여주는 경량 풀스택 대시보드입니다.

- FastAPI 백엔드와 Next.js 프론트엔드로 구성됩니다.
- 별도 DB나 Redis 없이 인메모리 TTL 캐시만 사용합니다.
- 기존 Redmine API 연동을 유지하면서, 단순 이슈 뷰어가 아니라 관리 판단용 운영 대시보드에 맞춰 리팩터링되어 있습니다.

## 핵심 방향

이 프로젝트는 다음 질문에 빠르게 답하는 것을 목표로 합니다.

- 지금 무엇이 위험한가
- 이번 주 무엇을 챙겨야 하는가
- 어떤 이슈가 오래 멈춰 있거나 지연되고 있는가
- 누가 과부하 상태인가
- 프로젝트 흐름이 나아지고 있는가, 악화되고 있는가

현재 UI는 다음 5개 레이어를 중심으로 구성됩니다.

1. 상단 운영 KPI
2. 즉시 조치 필요 패널
3. 팀 작업 여력 패널
4. 프로젝트 상태 패널
5. 이슈 탐색기 + 내부 상세 드로어

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
├── requirements.txt
├── README.md
│
├── app/
│   ├── main.py
│   ├── api/
│   │   └── v1/
│   │       ├── dashboard.py
│   │       ├── deps.py
│   │       └── router.py
│   ├── client/
│   │   └── redmine_client.py
│   ├── core/
│   │   └── config.py
│   ├── schemas/
│   │   └── dashboard.py
│   └── services/
│       ├── issue_service.py
│       ├── project_service.py
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
    │   ├── SectionCard.tsx
    │   ├── TeamCapacityPanel.tsx
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
      └── dashboard-derived.ts
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

프론트엔드는 project shell이 공통 데이터 로딩과 설정 상태를 관리하고, 각 route가 화면별 상태만 소유합니다. 실제 운영 지표 계산은 `frontend/src/lib/dashboard.ts`와 `frontend/src/lib/dashboard/` 하위 모듈에 모아둡니다.

이 계층이 담당하는 일:

- 공통 프로젝트 데이터 fetch / refresh
- Home, Issues, Team, Settings route 간 공통 shell/context 제공
- KPI/상태 스냅샷/조치 큐/팀 인사이트/상태 점수 계산
- 임계값 설정의 localStorage 저장 및 재계산
- 이슈 탐색기 preset / signal 계산

즉, UI 컴포넌트는 되도록 표시만 담당하고, 계산 로직은 변환 레이어로 모읍니다.

현재 route 구조:

- `/dashboard/[projectId]`: action-first Home
- `/dashboard/[projectId]/issues`: 이슈 작업 화면
- `/dashboard/[projectId]/team`: 담당자/팀 분석
- `/dashboard/[projectId]/settings`: 임계값과 점수 기준 설정

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

### 1. 설정 준비

`config.json`에 Redmine 연결 정보를 넣습니다.

예시:

```json
{
  "redmine": {
    "base_url": "http://your-redmine-host:port",
    "api_key": "your_redmine_api_key",
    "timeout": 30,
    "retry_attempts": 3,
    "page_size": 100
  },
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

### 2. 백엔드 실행

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

운영에서는 단일 워커를 권장합니다.

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 3. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

기본 접속 주소:

- 프론트엔드: `http://localhost:3000`
- 백엔드: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`

### 4. 프론트엔드 프록시

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

## 운영 신호 계산 기준

현재 하드코딩된 기본 기준은 다음과 같습니다.

- `due soon`: 7일 이내 마감
- `stale`: 7일 이상 업데이트 없음
- `closed recently`: 최근 7일 내 완료
- `health score`: overdue, stale, unassigned, recent flow balance 조합
- `capacity band`: risk score 기반으로 안정 / 주의 / 과부하 분류

이 기준은 `frontend/src/lib/dashboard.ts`와 `app/services/issue_service.py`에서 조정할 수 있습니다.

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

- `config.json`의 API 키는 민감 정보입니다.
- 실제 운영 저장소에서는 커밋하지 않거나 배포 단계에서 주입하는 방식을 권장합니다.
- `assets` 프록시는 동일 Redmine origin만 허용하도록 구현되어 있습니다.

## 현재 버전 메모

이번 리팩터링에서 반영된 핵심 변경:

- 모니터링형 화면을 관리형 운영 대시보드로 재구성
- KPI를 운영 신호 중심으로 교체
- 가운데 영역을 즉시 조치 큐로 대체
- workload를 담당자 위험 신호 중심으로 압축
- 이슈 목록을 이슈 탐색기로 개편
- 내부 상세 드로어에 관련 이슈/변경 이력/첨부 강화
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