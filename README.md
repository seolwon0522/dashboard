# Redmine Dashboard

> Redmine REST API 기반 이슈 현황 대시보드.  
> DB / Redis 없이 인메모리 TTL 캐시만으로 구동되는 풀스택 MVP.  
> FastAPI 백엔드 + Next.js 프론트엔드 구성.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [데이터 흐름](#4-데이터-흐름)
5. [주요 기능](#5-주요-기능)
6. [실행 방법](#6-실행-방법)
7. [API 엔드포인트](#7-api-엔드포인트)
8. [설정 파일 가이드](#8-설정-파일-가이드)
9. [현재 구현 상태](#9-현재-구현-상태)
10. [알려진 한계](#10-알려진-한계)
11. [향후 계획](#11-향후-계획)
12. [버전 히스토리](#12-버전-히스토리)

---

## 1. 프로젝트 개요

Redmine 프로젝트 관리 시스템의 이슈 데이터를 실시간으로 집계하여 운영 대시보드 형태로 시각화하는 풀스택 시스템.

- **데이터 소스**: Redmine REST API (직접 호출, 페이지네이션 자동 처리)
- **캐시 전략**: 프로세스 내 TTL 딕셔너리 캐시 (DB / Redis 미사용)
- **라우팅**: `/` 프로젝트 선택 → `/dashboard/[projectId]` 프로젝트별 대시보드
- **프로젝트 전환**: 헤더 드롭다운으로 전환, URL 기반 상태 유지

---

## 2. 기술 스택

### 백엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Python | 3.12+ | 런타임 |
| FastAPI | 0.115.0 | API 프레임워크 |
| Uvicorn | 0.30.0 | ASGI 서버 |
| httpx | 0.27.0 | 비동기 HTTP 클라이언트 (Redmine API 호출) |
| Pydantic v2 | FastAPI 내장 | 응답 스키마 직렬화 / 검증 |

### 프론트엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Next.js | 14.2.0 | React 프레임워크 (App Router) |
| React | 18.3+ | UI 렌더링 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 3.4+ | 스타일링 (외부 차트 라이브러리 미사용) |

---

## 3. 프로젝트 구조

```text
dashboard/
├── config.json                        # Redmine 연결 정보 + 대시보드 설정
├── requirements.txt                   # Python 패키지 목록
│
├── app/                               # FastAPI 백엔드
│   ├── main.py                        # 앱 진입점, lifespan, 글로벌 예외 핸들러
│   │
│   ├── core/                          # 인프라 계층 (도메인 무관)
│   │   ├── config.py                  # config.json 파싱, Settings 싱글턴 (lru_cache)
│   │   └── cache.py                   # TTL 인메모리 캐시 (asyncio.Lock 동시성 보호)
│   │
│   ├── client/                        # 외부 API 통신 계층
│   │   └── redmine_client.py          # httpx 비동기 클라이언트, 자동 페이지네이션
│   │
│   ├── services/                      # 비즈니스 로직 계층
│   │   ├── utils.py                   # 공통 순수 함수 (calc_overdue 등)
│   │   ├── issue_service.py           # 이슈 집계 / 요약 / overdue 판단
│   │   ├── project_service.py         # 프로젝트 목록 + open 이슈 수 집계
│   │   └── workload_service.py        # 담당자별 워크로드 + 멤버 이슈 상세
│   │
│   ├── api/                           # HTTP 수신 계층
│   │   └── v1/
│   │       ├── router.py              # v1 라우터 통합 등록
│   │       ├── dashboard.py           # 6개 대시보드 엔드포인트
│   │       └── deps.py                # FastAPI Depends 의존성 주입
│   │
│   └── schemas/
        └── dashboard.py               # Pydantic 응답 모델 정의 (IssueListItem / IssueListResponse 포함)
│
└── frontend/                          # Next.js 프론트엔드
    ├── next.config.mjs                # API 프록시 설정 (rewrites: /api/v1/* → :8000)
    ├── tailwind.config.ts             # Tailwind 설정 + 모달 애니메이션 keyframe
    ├── package.json
    │
    └── src/
        ├── app/
        │   ├── layout.tsx             # 루트 레이아웃
        │   ├── globals.css            # Tailwind 전역 스타일
        │   ├── page.tsx               # 프로젝트 선택 페이지 (/)
        │   └── dashboard/
        │       └── [projectId]/
        │           └── page.tsx       # 프로젝트별 대시보드 (/dashboard/:id)
        │
        ├── components/
        │   ├── DashboardView.tsx      # 대시보드 오케스트레이터: 공유 필터 상태 + 전체 레이아웃
        │   ├── KpiRow.tsx             # 컴팩트 KPI 카드 5개 (클릭 시 이슈 테이블 필터)
        │   ├── FilterChips.tsx        # 활성 필터 칩 표시 + 제거
        │   ├── StatusDistribution.tsx # 상태 분포 위젯 (클릭 시 이슈 테이블 필터)
        │   ├── AttentionPanel.tsx     # 주의 이슈 패널 (Overdue / Due Soon / High Priority 탭)
        │   ├── IssueTable.tsx         # 전체 이슈 테이블 (정렬·검색·페이지네이션·행 선택)
        │   ├── IssueDetailDrawer.tsx  # 선택 이슈 상세 패널 (기본 정보 + 설명 + 변경 이력)
        │   ├── WorkloadBar.tsx        # 담당자별 워크로드 컴팩트 테이블 (클릭 시 필터)
        │   ├── SummaryCard.tsx        # KPI 카드 기본 컴포넌트 (레거시, 유지)
        │   ├── OverdueTable.tsx       # 기한 초과 이슈 테이블 (레거시, 유지)
        │   ├── ProjectSelect.tsx      # 프로젝트 전환 드롭다운
        │   └── MemberModal.tsx        # 담당자 이슈 상세 모달
        │
        ├── lib/
        │   ├── api.ts                 # API 호출 함수 모음
        │   └── labels.ts              # 공통 상태/우선순위/동기화 라벨 상수
        │
        └── types/
            └── dashboard.ts           # TypeScript 타입 정의 (백엔드 스키마와 1:1)
```

### 백엔드 계층 원칙

| 계층 | 역할 | 금지 사항 |
|---|---|---|
| `api/` | HTTP 수신, 파라미터 검증, Pydantic 직렬화 | 비즈니스 로직 직접 구현 |
| `services/` | 집계, 필터, overdue 판단, 캐시 관리 | HTTP 직접 호출 |
| `services/utils.py` | 여러 서비스가 공유하는 순수 함수 | 상태 보유 |
| `client/` | Redmine API 호출, 페이지네이션 처리 | 비즈니스 판단 |
| `core/` | 설정 파싱, 캐시 인프라 제공 | 도메인 의존 |

> `GET /api/v1/dashboard/issues`(전체 이슈 목록) 엔드포인트는 기존 `issues:{project_id}` 캐시를 재사용하므로 Redmine 추가 호출 없음.

---

## 4. 데이터 흐름

```text
사용자 (브라우저)
  │
  │  페이지 요청 / 컴포넌트 fetch
  ▼
Next.js 프론트엔드 (localhost:3000)
  │
  │  fetch /api/v1/*  →  next.config.mjs rewrites 적용 (CORS 불필요)
  ▼
FastAPI 엔드포인트  api/v1/dashboard.py
  │
  │  Depends() 의존성 주입으로 서비스 객체 수신
  ▼
Service 계층  services/{issue,project,workload}_service.py
  │
  ├─ 캐시 HIT  →  인메모리 TTL 캐시에서 즉시 반환
  │               (캐시 키: issues:{project_id})
  │
  └─ 캐시 MISS  →  Redmine 클라이언트 호출
                    │
                    ▼
                  RedmineClient  client/redmine_client.py
                    │
                    │  httpx.AsyncClient, 자동 페이지네이션
                    ▼
                  Redmine REST API (외부)
                    │
                    │  JSON 응답 반환
                    ▼
                  캐시에 저장 (TTL: config.cache_ttl_seconds)
  │
  │  Pydantic 모델로 직렬화
  ▼
JSON 응답  →  Next.js 컴포넌트 렌더링
```

### 캐시 공유 전략

- 캐시 키: `issues:{project_id}` — `IssueService`와 `WorkloadService`가 동일 캐시 키 공유
- `WorkloadService`는 별도 Redmine 호출 없이 `IssueService` 캐시를 재사용
- TTL 만료 시 다음 요청에서 자동 갱신 (lazy refresh)

---

## 5. 주요 기능

### 프로젝트 선택 페이지 (`/`)

- 접근 가능한 전체 프로젝트를 카드 그리드로 표시
- 각 카드에 프로젝트명 + open 이슈 수 표시
- 카드 클릭 → `/dashboard/[projectId]` 이동

### 프로젝트 대시보드 (`/dashboard/[projectId]`)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← 뒤로  Redmine Dashboard / My Project   [프로젝트 전환 ▾]  Synced 2m ago ↺│  헤더 (sticky)
├───────────┬───────────┬───────────┬───────────┬─────────────────────────────┤
│Total Iss. │  Open     │In Progress│  Overdue  │  Completion Rate             │  KPI 카드 5개
│   62      │   12      │    5      │  ❗ 3     │       73%                   │  (클릭 → 필터)
├───────────┴───────────┴───────────┴───────────┴─────────────────────────────┤
│  [좌 1/3 — Assignee Workload + Status Distribution]                          │
│                                                                               │
│  Assignee   Open  Overdue  👁         Overdue │ Due Soon │ High Priority     │  우측:
│  Alice        8      2     ◎         ──────────────────────────────────      │  AttentionPanel
│  Bob          6      0     ◎         #123 제목...  Alice  +5일 overdue       │  (탭 전환)
│  Unassigned   3      1     ◎         #456 제목...  Bob    due 2026-04-10     │
│                                                                               │
│  [Status Distribution]                                                        │
│  Open    12  20%  ████                                                        │
│  In Prog  5   8%  ██                                                          │
│  Closed  45  72%  ████████████████                                            │
├───────────────────────────────────────────────────────────────────────────────┤
│  All Issues  [Status: Open ×] [Assignee: Alice ×]  Clear all                 │  FilterChips
│  ┌────┬──────────────────┬────────────┬─────────┬──────────┬───────┬───────┐ │
│  │ ID │ Title            │ Status     │ Assignee│ Priority │  Due  │Upd.   │ │  IssueTable
│  │ 12 │ API 명세 업데이트 │ ● In Prog  │ Alice   │ High     │ 04-10 │ 04-07 │ │  (정렬·검색·
│  │  8 │ 배포 연동 개발    │ ● Open     │ Bob     │ Normal   │  —    │ 04-06 │ │   페이지네이션)
│  └────┴──────────────────┴────────────┴─────────┴──────────┴───────┴───────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
```

**인터랙션:**
- **KPI 카드 클릭** → 상태 그룹 또는 overdue 기준으로 이슈 테이블 필터링 (재클릭 시 해제)
- **Assignee Workload 행 클릭** → 해당 담당자로 이슈 테이블 필터링 (눈 아이콘은 상세 모달)
- **Status Distribution 행 클릭** → 해당 상태 그룹으로 이슈 테이블 필터링
- **FilterChips** → 활성 필터 확인 및 개별 제거 / Clear all
- **IssueTable 행 클릭** → 우측 이슈 상세 패널 열기
- **이슈 상세 패널** → 기본 정보 / 설명 / 변경 이력 확인, 필요 시 Redmine 원본 링크 열기
- **IssueTable 컬럼 헤더 클릭** → 오름차순/내림차순 정렬 토글
- **헤더 ↺ 버튼** → 전체 데이터 수동 새로고침 (모든 캐시 재조회)
- **헤더 드롭다운** → 프로젝트 전환 (URL 변경, 필터 초기화)

---

## 6. 실행 방법

### 사전 요건

- Python 3.12+
- Node.js 18+
- 접근 가능한 Redmine 인스턴스 + API 키

### 1단계 — 설정 확인

`config.json`의 Redmine 연결 정보와 `status_groups` ID 값이 실제 Redmine 인스턴스와 일치하는지 확인.

> **`status_groups` ID 확인**: Redmine 어드민 → 이슈 추적 → 상태 메뉴에서 각 상태의 ID 확인 후 그룹에 배치.

### 2단계 — 백엔드 실행

```bash
pip install -r requirements.txt

# 개발 환경 (파일 변경 시 자동 리로드)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 운영 환경 (인메모리 캐시 공유 이슈로 단일 워커 권장)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 3단계 — 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.  
`next.config.mjs` rewrites 설정으로 `/api/v1/*` 요청이 백엔드(8000)로 자동 프록시됩니다.

### 4단계 — API 문서 확인 (선택)

| URL | 설명 |
|---|---|
| `http://localhost:8000/docs` | Swagger UI (인터랙티브 테스트) |
| `http://localhost:8000/redoc` | ReDoc 문서 |
| `http://localhost:8000/health` | 헬스체크 |

---

## 7. API 엔드포인트

모든 엔드포인트는 `?project_id=` 쿼리 파라미터를 선택적으로 지원합니다.  
미지정 시 `config.json`의 `default_project` 값을 사용합니다.

### 엔드포인트 목록

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/v1/dashboard/summary` | 이슈 전체 요약 통계 |
| `GET` | `/api/v1/dashboard/projects` | 전체 프로젝트 목록 + open 이슈 수 |
| `GET` | `/api/v1/dashboard/issues` | **전체 이슈 목록** (상태 그룹·담당자·기한 초과 여부 포함) |
| `GET` | `/api/v1/dashboard/issues/{issue_id}` | **단일 이슈 상세 + journals 변경 이력** |
| `GET` | `/api/v1/dashboard/issues/overdue` | 기한 초과 이슈 목록 |
| `GET` | `/api/v1/dashboard/workload` | 담당자별 워크로드 |
| `GET` | `/api/v1/dashboard/workload/member` | 특정 담당자 이슈 상세 |

---

### `GET /api/v1/dashboard/issues`

전체 이슈 목록 반환. 상태 그룹(`status_group`), 담당자 ID, 마감일, 갱신일, 기한 초과 여부 포함.  
기존 캐시(`issues:{project_id}`)를 재사용하므로 Redmine 추가 API 호출 없음.

```json
{
  "project_id": "my-project",
  "total": 17,
  "issues": [
    {
      "id": 8821,
      "subject": "API 명세 업데이트",
      "status": "In Progress",
      "status_group": "in_progress",
      "priority": "High",
      "assigned_to": "홍길동",
      "assigned_to_id": 12,
      "due_date": "2026-04-10",
      "updated_on": "2026-04-07",
      "is_overdue": false,
      "days_overdue": 0,
      "url": "http://your-redmine/issues/8821"
    }
  ],
  "cached_at": "2026-04-07T10:00:00.000000"
}
```

---

### `GET /api/v1/dashboard/issues/{issue_id}`

선택한 이슈의 상세 정보와 Redmine journal 변경 이력을 반환.
Redmine `GET /issues/{id}.json?include=journals`를 사용하며, 이슈 단건 기준으로 짧은 TTL 캐시를 적용.

```json
{
  "id": 8821,
  "subject": "API 명세 업데이트",
  "description": "배포 전 연동 규격 최종 점검 필요",
  "status": "In Progress",
  "status_id": 3,
  "status_group": "in_progress",
  "priority": "High",
  "assigned_to": "홍길동",
  "assigned_to_id": 12,
  "author": "김철수",
  "tracker": "Feature",
  "category": null,
  "version": "v1.2.0",
  "start_date": "2026-04-01",
  "due_date": "2026-04-10",
  "done_ratio": 70,
  "created_on": "2026-04-01T09:00:00Z",
  "updated_on": "2026-04-07T13:20:00Z",
  "url": "http://your-redmine/issues/8821",
  "journals": [
    {
      "id": 101,
      "user": "홍길동",
      "created_on": "2026-04-07T13:20:00Z",
      "notes": "배포 일정 확인 완료",
      "changes": [
        {
          "field": "status_id",
          "property": "attr",
          "old_value": "Open",
          "new_value": "In Progress"
        }
      ]
    }
  ]
}
```

---

### `GET /api/v1/dashboard/summary`

이슈 전체 요약 통계. 상태 그룹별 건수 + 기한 초과 건수 반환.

```json
{
  "project_id": "my-project",
  "total": 17,
  "by_status_group": {
    "open": 5,
    "in_progress": 2,
    "closed": 10
  },
  "overdue": 3,
  "cached_at": "2026-04-02T09:39:09.589047"
}
```

---

### `GET /api/v1/dashboard/projects`

접근 가능한 전체 프로젝트 목록 + 각 프로젝트의 open 이슈 수.

> N+1 방지: 이슈 전체를 1회 조회 후 `project.id` 기준으로 인메모리 집계.

```json
{
  "projects": [
    { "id": "project-a", "name": "Project A", "open_issues": 5 },
    { "id": "project-b", "name": "Project B", "open_issues": 0 }
  ],
  "cached_at": "2026-04-02T09:39:25.947147"
}
```

---

### `GET /api/v1/dashboard/issues/overdue`

기한(`due_date`) 초과 이슈 목록 (초과일 기준 내림차순). closed 상태 제외.

```json
{
  "project_id": "my-project",
  "count": 2,
  "issues": [
    {
      "id": 8821,
      "subject": "API 명세 업데이트",
      "due_date": "2026-03-25",
      "assigned_to": "홍길동",
      "status": "In Progress",
      "priority": "High",
      "days_overdue": 8,
      "url": "http://your-redmine/issues/8821"
    }
  ],
  "cached_at": "2026-04-02T09:39:15.064197"
}
```

---

### `GET /api/v1/dashboard/workload`

담당자별 open 이슈 수 + overdue 이슈 수 (open 기준 내림차순). 미할당 이슈 별도 집계.

```json
{
  "project_id": "my-project",
  "workload": [
    { "user_id": 12,   "name": "홍길동", "open_issues": 14, "overdue_issues": 3 },
    { "user_id": 7,    "name": "김철수", "open_issues": 9,  "overdue_issues": 0 },
    { "user_id": null, "name": "미할당", "open_issues": 5,  "overdue_issues": 2 }
  ],
  "cached_at": "2026-04-02T09:39:21.497968"
}
```

---

### `GET /api/v1/dashboard/workload/member`

특정 담당자의 오픈/진행 중 이슈 상세 목록. 기존 캐시(`issues:{project_id}`)를 재사용하므로 추가 Redmine 호출 없음.

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `user_id` | int (선택) | 담당자 Redmine 사용자 ID |
| `unassigned` | bool (선택) | `true`면 미할당 이슈만 반환 |
| `project_id` | string (선택) | 프로젝트 ID |

```json
{
  "project_id": "my-project",
  "user_id": 12,
  "user_name": "홍길동",
  "total": 3,
  "overdue_count": 1,
  "issues": [
    {
      "id": 25,
      "subject": "배포 I/F 연동 개발",
      "status": "진행",
      "priority": "보통",
      "due_date": "2026-04-17",
      "is_overdue": false,
      "days_overdue": 0,
      "url": "http://your-redmine/issues/25"
    }
  ],
  "cached_at": "2026-04-02T10:45:33.304795"
}
```

---

## 8. 설정 파일 가이드

### `config.json` 전체 구조

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
      "open":        [1, 2],
      "in_progress": [3, 4],
      "closed":      [5, 6, 7]
    },
    "overdue_rule": {
      "field": "due_date",
      "exclude_status_groups": ["closed"]
    },
    "stale_rule": {
      "days_without_update": 14,
      "exclude_status_groups": ["closed"]
    }
  }
}
```

### 주요 설정 항목

| 항목 | 설명 | 비고 |
|---|---|---|
| `redmine.page_size` | 페이지당 이슈 수 (Redmine 최대 100) | 기본값 `100` |
| `dashboard.default_project` | 기본 조회 프로젝트 identifier | 필수 |
| `dashboard.include_subprojects` | 하위 프로젝트 이슈 포함 여부 | 기본값 `false` |
| `dashboard.cache_ttl_seconds` | 캐시 유효 시간 (초) | 기본값 `300` |
| `dashboard.status_groups` | 상태 ID → 그룹 매핑 | 필수, Redmine 어드민에서 ID 확인 |
| `overdue_rule.exclude_status_groups` | overdue 판단 제외 상태 그룹 | 기본값 `["closed"]` |

---

## 9. 현재 구현 상태

### 완료된 기능

| 분류 | 기능 | 비고 |
|---|---|---|
| 백엔드 | FastAPI 4계층 구조 (api / service / client / core) | v0.1 |
| 백엔드 | `config.json` 기반 설정 로드 (`lru_cache` 싱글턴) | v0.1 |
| 백엔드 | TTL 인메모리 캐시 (`asyncio.Lock` 동시성 보호) | v0.1 |
| 백엔드 | Redmine 비동기 클라이언트 (httpx, 자동 페이지네이션) | v0.1 |
| 백엔드 | 6개 대시보드 API 엔드포인트 | v0.1–v0.4 |
| 백엔드 | `services/utils.py` 공통 함수 분리 (`calc_overdue`) | v0.3 |
| 백엔드 | `WorkloadService` 캐시 중복 제거 (IssueService 캐시 재사용) | v0.3 |
| 백엔드 | 글로벌 예외 핸들러 (JSON 500 응답 보장) | v0.3 |
| 백엔드 | 전체 이슈 목록 API (`GET /api/v1/dashboard/issues`) — 캐시 재사용 | v0.4 |
| 백엔드 | 단일 이슈 상세 API (`GET /api/v1/dashboard/issues/{issue_id}`) — journals 포함 | v0.5 |
| 프론트엔드 | 프로젝트 선택 초기 화면 (`/`) — 카드 그리드 | v0.3 |
| 프론트엔드 | 프로젝트별 대시보드 (`/dashboard/[projectId]`) — URL 기반 라우팅 | v0.3 |
| 프론트엔드 | KPI 카드 5개 — Total / Open / In Progress / Overdue / Completion Rate | v0.4 |
| 프론트엔드 | KPI · 담당자 · 상태 클릭 → 이슈 테이블 공유 필터링 (`useReducer`) | v0.4 |
| 프론트엔드 | 활성 필터 칩 표시 + 개별/전체 제거 (`FilterChips`) | v0.4 |
| 프론트엔드 | 주의 이슈 패널 — Overdue / Due Soon / High Priority 탭 (`AttentionPanel`) | v0.4 |
| 프론트엔드 | 전체 이슈 테이블 — 7컬럼 정렬·검색·페이지네이션·행 선택 (`IssueTable`) | v0.4 |
| 프론트엔드 | 우측 이슈 상세 패널 — 기본 정보 / 설명 / 변경 이력 (`IssueDetailDrawer`) | v0.5 |
| 프론트엔드 | 담당자별 워크로드 컴팩트 테이블 (클릭 필터 + 상세 모달 분리) | v0.4 |
| 프론트엔드 | 상태 분포 위젯 — 건수·% + 클릭 필터 (`StatusDistribution`) | v0.4 |
| 프론트엔드 | 헤더 통합 — 프로젝트명·선택·동기화 시각·수동 새로고침 버튼 | v0.4 |
| 프론트엔드 | 담당자 클릭 → 이슈 상세 모달 (ESC / 배경 클릭 닫기) | v0.2 |
| 프론트엔드 | 스켈레톤 로딩 (KPI·워크로드·상태) + 에러 Retry 버튼 | v0.4 |

### 미구현 / 부분 구현

| 기능 | 상태 | 비고 |
|---|---|---|
| 캐시 수동 무효화 API | 미구현 | Phase 1 계획 |
| 만료 항목 자동 정리 | 미구현 | Phase 1 계획 |
| 스테일 이슈 목록 API | 미구현 (config에 `stale_rule` 설정만 존재) | Phase 2 계획 |
| 자동 새로고침 (polling) | 미구현 | Phase 2 계획 |
| 트렌드 / 번다운 차트 | 미구현 | Phase 3 계획 |
| 이슈 테이블 URL 필터 동기화 | 미구현 | 필터 상태 URL 쿼리 파라미터 반영 계획 |

---

## 10. 알려진 한계

### 인메모리 캐시 구조적 한계

| 한계 | 영향 | 현재 대응 |
|---|---|---|
| 프로세스 재시작 시 캐시 소멸 | 재시작 직후 첫 요청은 Redmine API 직접 호출 | 서버 재시작 최소화 |
| 멀티 워커 캐시 공유 불가 | `--workers N` 시 워커마다 독립 캐시 → 호출 N배 | **단일 워커 운영 권장** |
| 메모리 상한 없음 | 장시간 운영 시 만료 항목 누적 가능 | TTL 자동 정리 추후 구현 예정 |

### Redmine API 제약으로 계산 불가한 KPI

| KPI | 이유 |
|---|---|
| 이번 주 해결된 이슈 수 | Redmine 기본 API는 현재 상태만 반환 |
| 평균 해결 시간 (MTTR) | Journals API 개별 조회 필요 (N+1 문제) |
| 일별 번다운 차트 | 날짜별 스냅샷 없이 추이 계산 불가 |
| 개인별 처리 속도 | 이슈 완료 담당자 추적 불가 |

---

## 11. 향후 계획

### Phase 1 — 안정성 개선 (단기)

| 항목 | 내용 |
|---|---|
| 캐시 수동 무효화 | `DELETE /api/v1/cache?key=...` 엔드포인트 추가 |
| 만료 항목 자동 정리 | `asyncio` background task, 60초 주기 |
| Redmine 상태 자동 조회 | 앱 시작 시 `GET /issue_statuses.json` → 상태 ID 자동 매핑 |
| 캐시 통계 엔드포인트 | `GET /api/v1/cache/stats` — 적중률, 항목 수 |

### Phase 2 — 기능 확장 (중기)

| 항목 | 내용 |
|---|---|
| 스테일 이슈 목록 | `GET /api/v1/dashboard/issues/stale` — N일 이상 미업데이트 이슈 |
| 우선순위별 분포 | High / Normal / Low 이슈 수 집계 표시 |
| 버전(마일스톤)별 진행률 | Redmine `/versions.json` 기반 완료율 |
| 자동 새로고침 | n분 간격 polling (프론트엔드 `useInterval`) |

### Phase 3 — 히스토리 / 트렌드 (중기, DB 없이 제한적 구현)

| 항목 | 내용 | 한계 |
|---|---|---|
| 인메모리 일별 스냅샷 | 자정마다 summary를 `app.state`에 누적 | 재시작 시 소멸 |
| 주간 트렌드 API | 최근 7일 스냅샷 기반 open 추이 반환 | 재시작 전 데이터 없음 |

### Phase 4 — 인프라 확장 (장기, DB 도입 시)

현재 `services/` 계층은 `client/`를 통해서만 데이터를 받도록 명확히 분리되어 있어,  
DB 도입 시 `repository/` 계층만 추가하면 **서비스 로직 변경 없이** 데이터 소스 교체 가능.

```text
현재 (MVP):    service  →  client (Redmine 실시간 조회)

DB 도입 후:    service  →  repository (DB 조회)
                                ↑
               동기화 워커  →  client (Redmine 주기적 동기화)
```

| 항목 | 내용 |
|---|---|
| PostgreSQL + SQLAlchemy | 이슈 스냅샷 영구 저장 |
| Redis 캐시 | 멀티 워커 캐시 공유, `--workers N` 지원 |
| Redmine 웹훅 수신 | 이슈 변경 이벤트 → 캐시 즉시 무효화 |
| 인증 / 권한 제어 | API Key 미들웨어 또는 JWT |

---

## 12. 버전 히스토리

| 버전 | 날짜 | 주요 변경사항 |
|---|---|---|
| v0.4 | 2026-04-07 | 운영 대시보드로 전면 리팩토링 — 공유 필터, 이슈 테이블, 주의 이슈 패널 |
| v0.3 | 2026-04-02 | 라우팅 분리, 코드 품질 개선, UI/UX 전면 개선 |
| v0.2 | 2026-04-02 | Next.js 프론트엔드 구축, 담당자 상세 모달 추가 |
| v0.1 | 2026-04-02 | FastAPI 백엔드 MVP (4계층 구조, 4개 엔드포인트) |

### v0.4 — 운영 대시보드 리팩토링 (2026-04-07)

**백엔드**
- `GET /api/v1/dashboard/issues` 엔드포인트 추가 — 전체 이슈 목록 (상태 그룹, 담당자 ID, 마감일, 갱신일, 기한 초과 여부 포함)
- `IssueService.get_all_issues()` 구현 — 기존 `issues:{project_id}` 캐시 재사용, Redmine 추가 호출 없음
- `schemas/dashboard.py` — `IssueListItem`, `IssueListResponse` Pydantic 모델 추가

**프론트엔드 — 신규 컴포넌트**
- `KpiRow` — Total / Open / In Progress / Overdue / Completion Rate 5개 카드. 클릭 시 이슈 테이블 필터 적용, 재클릭 시 해제
- `FilterChips` — 활성 필터 칩 표시, 개별 × 버튼 및 Clear all 지원
- `StatusDistribution` — 상태별 건수·% + 미니 프로그레스 바. 클릭 시 이슈 테이블 필터 적용
- `AttentionPanel` — Overdue / Due Soon(7일 이내) / High Priority 이슈를 탭으로 전환. 0건 시 성공 메시지 표시
- `IssueTable` — 전체 이슈 테이블 (ID·제목·상태·담당자·우선순위·마감일·갱신일 7컬럼, 클라이언트 정렬, 텍스트 검색, 25행 페이지네이션, 행 클릭 → Redmine 새 탭)

**프론트엔드 — 리팩토링**
- `DashboardView` 전면 재작성 — `useReducer` 기반 공유 필터 상태 관리, 헤더(sticky) + KPI + 2컬럼 분석 + 이슈 테이블 레이아웃 통합
- `WorkloadBar` — 바 차트 → 컴팩트 테이블 형태로 교체. 행 클릭 시 이슈 테이블 필터링, 눈 아이콘 버튼으로 상세 모달 분리
- `[projectId]/page.tsx` — 순수 라우팅 셸로 단순화 (레이아웃·데이터 로직은 `DashboardView`에 위임)
- `types/dashboard.ts` — `IssueListItem`, `IssueListResponse`, `AssigneeFilter`, `DashboardFilter` 타입 추가
- `lib/api.ts` — `fetchAllIssues()` 함수 추가

**UX 개선 사항**
- 헤더에 동기화 시각(Synced N ago) 및 수동 새로고침 버튼 통합
- 프로젝트 전환 시 모든 필터 자동 초기화
- KPI·워크로드·상태 분포 스켈레톤 로딩 상태 추가
- 에러 상태에 Retry 버튼 추가
- 0건 Overdue: 기존 빈 카드 → AttentionPanel 내 성공 메시지로 대체

---

### v0.3 — 라우팅 분리 + 코드 품질 + UI/UX 전면 개선 (2026-04-02)

**라우팅 및 컴포넌트 구조 개편**
- 프로젝트 선택 초기 화면 추가 (`/`) — 카드 그리드, open 이슈 수 표시
- 프로젝트별 대시보드를 `/dashboard/[projectId]`로 분리 — URL 기반 상태, 뒤로가기 지원
- `DashboardView` 컴포넌트 신설 — `page.tsx`에서 데이터 조회 로직 분리

**백엔드 버그 수정 및 코드 품질**
- `subproject_id` 파라미터 조건 분기 수정
- 글로벌 예외 핸들러 추가 (`main.py`) — 처리되지 않은 예외 시 JSON 500 응답 보장
- `services/utils.py` 신설 — `calc_overdue()` 함수를 양쪽 서비스에서 공유
- `WorkloadService` 캐시 중복 제거 — `IssueService`와 동일 캐시 키 재사용

**UI/UX 개선**
- KPI 카드 재구성: "전체 이슈" 제거 → "진행 중(`in_progress`)" 추가, 전체 이슈 수는 보조 라인으로 이동
- Closed 카드에 처리율(%) 표시 (`subtitle` prop 추가)
- 기한 초과 카드: `overdue > 0`이면 배경 강조 (`highlight` prop)
- 3컬럼 고정 레이아웃 — 워크로드(좌 1/3) + 기한초과(우 2/3)
- 이슈 상태 분포 비율 바 추가 — `by_status_group` 데이터 재활용, 순수 Tailwind CSS
- `WorkloadBar` 스택 바 — overdue 구간 적색, 나머지 open 청색으로 색상 분리
- `OverdueTable` 컬럼 정리 — ID를 제목에 인라인 병합, 5컬럼으로 축소
- 기한 초과 0건 시 테이블 숨김 — 카드 내 "없음" 안내 문구로 대체
- 기한 초과 이슈 제목에 Redmine 직접 링크 추가 (`url` 필드 활용)

### v0.2 — 프론트엔드 + 담당자 상세 (2026-04-02)

- Next.js + TypeScript + Tailwind CSS 프론트엔드 구축 (App Router)
- KPI 요약 카드 4개 (전체 / Open / Closed / 기한초과)
- 기한 초과 이슈 테이블 (초과일 기준 색상 코딩)
- 담당자별 워크로드 바 차트 (CSS 기반, 차트 라이브러리 미사용)
- 프로젝트 선택 드롭다운 (변경 시 전체 데이터 재조회)
- `GET /api/v1/dashboard/workload/member` 엔드포인트 추가
- 담당자 클릭 → 모달 팝업 (오픈/진행 중 이슈 전체, 기한초과 하이라이트)
- 모달 UX: ESC 닫기, 배경 클릭 닫기, 슬라이드업 애니메이션, body 스크롤 잠금
- Next.js rewrites 프록시 설정 (CORS 불필요)

### v0.1 — MVP 백엔드 (2026-04-02)

- FastAPI 4계층 구조 (api / service / client / core)
- `config.json` 기반 설정 로드 (`lru_cache` 싱글턴)
- TTL 인메모리 캐시 (`asyncio.Lock` 동시성 보호)
- Redmine 비동기 클라이언트 (`httpx.AsyncClient`, 페이지네이션 자동 처리)
- 4개 엔드포인트 구현: summary / projects / overdue / workload
- 모든 엔드포인트에서 `?project_id=` 오버라이드 지원
- 상태 분류 하드코딩 없음 (`config.status_groups` 참조)
- Swagger UI 자동 생성 (`/docs`)

---

## README 업데이트 원칙

이 문서를 지속적으로 관리할 때 유지하면 좋은 작성 원칙.

- **현재 상태 기준으로 작성**: 구현되지 않은 기능은 `현재 구현 상태` 또는 `향후 계획`에만 기록
- **섹션 순서 유지**: 목차 번호 순서대로 문서 흐름 유지 (개요 → 구조 → 흐름 → 기능 → 실행 → API → 상태 → 계획 → 히스토리)
- **버전 히스토리 즉시 추가**: 기능 추가/수정 시 해당 버전 항목을 바로 기록
- **현재 구현 상태 표 업데이트**: 기능 완료 시 미구현 표에서 제거하고 완료 표에 추가
- **향후 계획 현실적으로 유지**: 실현 가능성이 낮거나 범위가 크게 바뀐 항목은 정리
- **API 응답 예시 동기화**: 스키마 변경 시 응답 예시도 함께 업데이트
- **설정 항목 설명 최신화**: `config.json` 구조 변경 시 설정 파일 가이드 섹션 반영
