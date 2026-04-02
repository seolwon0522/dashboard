# Redmine Dashboard

Redmine REST API 기반 대시보드 시스템.
데이터베이스, Redis 없이 인메모리 TTL 캐시만으로 구동되는 MVP.
**FastAPI 백엔드 + Next.js 프론트엔드** 풀스택 구성.

---

## 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [계층 설명](#계층-설명)
5. [실행 방법](#실행-방법)
6. [API 엔드포인트](#api-엔드포인트)
7. [설정 파일 가이드](#설정-파일-가이드)
8. [현재 개발 현황](#현재-개발-현황)
9. [알려진 한계](#알려진-한계)
10. [향후 개발 계획](#향후-개발-계획)

---

## 개요

Redmine 프로젝트 관리 시스템의 데이터를 집계하여 대시보드 형태로 제공하는 백엔드 API 서버.

- **데이터 소스**: Redmine REST API (직접 호출)
- **캐시**: 프로세스 내 TTL 딕셔너리 캐시 (DB / Redis 불필요)
- **기본 프로젝트**: `config.json`의 `default_project` 값 사용
- **프로젝트 오버라이드**: 모든 엔드포인트에서 `?project_id=` 쿼리 파라미터로 변경 가능

---

## 기술 스택

| 항목 | 버전 |
|---|---|
| Python | 3.12+ |
| FastAPI | 0.115.0 |
| Uvicorn | 0.30.0 |
| httpx | 0.27.0 |
| Pydantic v2 | (FastAPI 내장) |
| Next.js | 14.2.0 |
| React | 18.3+ |
| TypeScript | 5.x |
| Tailwind CSS | 3.4+ |

---

## 프로젝트 구조

```
dashboard/
├── config.json                      ← Redmine 연결 정보 및 대시보드 설정
├── requirements.txt                 ← Python 패키지 목록
├── app/
│   ├── main.py                      ← FastAPI 앱 진입점, lifespan 이벤트
│   ├── core/
│   │   ├── config.py                ← config.json 파싱 → Settings 싱글턴
│   │   └── cache.py                 ← TTL 기반 인메모리 캐시
│   ├── client/
│   │   └── redmine_client.py        ← httpx 비동기 클라이언트 + 페이지네이션 전담
│   ├── services/
│   │   ├── issue_service.py         ← 이슈 집계/요약/overdue 비즈니스 로직
│   │   ├── project_service.py       ← 프로젝트 목록 + 이슈 수 집계
│   │   └── workload_service.py      ← 담당자별 워크로드 + 멤버 이슈 상세
│   ├── api/
│   │   └── v1/
│   │       ├── router.py            ← v1 라우터 통합 등록
│   │       ├── dashboard.py         ← 5개 대시보드 엔드포인트 정의
│   │       └── deps.py              ← FastAPI Depends 의존성 주입 함수
│   └── schemas/
│       └── dashboard.py             ← Pydantic 응답 모델 정의
│
└── frontend/                        ← Next.js 프론트엔드
    ├── next.config.mjs              ← API 프록시 설정 (rewrites)
    ├── tailwind.config.ts           ← Tailwind 설정 + 모달 애니메이션
    ├── postcss.config.js
    ├── package.json
    └── src/
        ├── app/
        │   ├── layout.tsx                    ← 루트 레이아웃
        │   ├── globals.css                   ← Tailwind 전역 스타일
        │   ├── page.tsx                      ← 프로젝트 선택 페이지 (/)
        │   └── dashboard/
        │       └── [projectId]/
        │           └── page.tsx              ← 프로젝트별 대시보드 (/dashboard/:id)
        ├── components/
        │   ├── DashboardView.tsx      ← 대시보드 본체 (데이터 조회 + 렌더링)
        │   ├── SummaryCard.tsx        ← KPI 요약 카드 (highlight / subtitle 지원)
        │   ├── OverdueTable.tsx       ← 기한 초과 이슈 테이블 (0건 시 숨김)
        │   ├── WorkloadBar.tsx        ← 워크로드 바 (open/overdue 스택 바)
        │   ├── ProjectSelect.tsx      ← 프로젝트 전환 드롭다운
        │   └── MemberModal.tsx        ← 담당자 이슈 상세 모달
        ├── lib/
        │   └── api.ts               ← API 호출 함수
        └── types/
            └── dashboard.ts         ← TypeScript 타입 정의
```

---

## 계층 설명

### 데이터 흐름

```
Frontend / 클라이언트
       │  HTTP 요청
       ▼
 api/v1/dashboard.py          ← 요청 수신, 파라미터 검증, 응답 직렬화
       │  service 호출
       ▼
 services/                    ← 비즈니스 로직 + 캐시 조회/저장
       │  캐시 미스 시
       ▼
 client/redmine_client.py     ← Redmine API 호출 + 페이지네이션 처리
       │
       ▼
 Redmine REST API (외부)
```

### 각 계층 원칙

| 계층 | 역할 | 금지 사항 |
|---|---|---|
| `api/` | HTTP 수신, 직렬화 | 비즈니스 로직 작성 |
| `services/` | 집계, 필터, 캐시 관리 | HTTP 직접 호출 |
| `client/` | Redmine API 호출, 페이지네이션 | 비즈니스 판단 |
| `core/` | 설정, 캐시 인프라 | 도메인 의존 |

---

## 실행 방법

### 1. 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 설정 확인

`config.json`의 Redmine 연결 정보 및 상태 그룹 ID가 실제 Redmine 인스턴스와 일치하는지 확인.

> **중요**: `status_groups`의 ID 값은 Redmine 어드민 → 이슈 상태 메뉴에서 확인 필요.

### 3. 서버 실행

```bash
# 개발 환경 (자동 리로드)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 운영 환경 (단일 워커 권장 — 인메모리 캐시 공유 이슈)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:3000`에서 실행됩니다.  
`next.config.mjs`의 rewrites 설정으로 `/api/v1/*` 요청이 백엔드(8000)로 프록시됩니다.

### 5. API 문서

| URL | 설명 |
|---|---|
| http://localhost:8000/docs | Swagger UI (인터랙티브 테스트 가능) |
| http://localhost:8000/redoc | ReDoc 문서 |
| http://localhost:8000/health | 헬스체크 |

---

## API 엔드포인트

모든 엔드포인트는 선택적 `?project_id=` 쿼리 파라미터를 지원합니다.  
미지정 시 `config.json`의 `default_project` 값을 사용합니다.

---

### `GET /api/v1/dashboard/summary`

전체 이슈 요약 통계 반환.

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `project_id` | string (선택) | 조회할 프로젝트 ID |

**응답 예시**

```json
{
  "project_id": "bp-cloudpos",
  "total": 17,
  "by_status_group": {
    "open": 5,
    "in_progress": 0,
    "closed": 12
  },
  "overdue": 2,
  "cached_at": "2026-04-02T09:39:09.589047"
}
```

---

### `GET /api/v1/dashboard/projects`

접근 가능한 전체 프로젝트 목록과 각 프로젝트의 active 이슈 수 반환.

> N+1 방지: 이슈 전체를 1회 조회 후 `project.id` 기준으로 인메모리 집계.

**응답 예시**

```json
{
  "projects": [
    { "id": "bp-cloudpos",      "name": "BP CloudPOS",      "open_issues": 5 },
    { "id": "bp-cloudpos-docs", "name": "BP CloudPOS Docs", "open_issues": 0 }
  ],
  "cached_at": "2026-04-02T09:39:25.947147"
}
```

---

### `GET /api/v1/dashboard/issues/overdue`

기한(`due_date`) 초과 이슈 목록 반환 (초과일 기준 내림차순).

**응답 예시**

```json
{
  "project_id": "bp-cloudpos",
  "count": 2,
  "issues": [
    {
      "id": 8821,
      "subject": "API 명세 업데이트",
      "due_date": "2026-03-25",
      "assigned_to": "홍길동",
      "status": "In Progress",
      "priority": "High",
      "days_overdue": 8
    }
  ],
  "cached_at": "2026-04-02T09:39:15.064197"
}
```

---

### `GET /api/v1/dashboard/workload`

담당자별 open 이슈 수 및 overdue 이슈 수 반환 (open 이슈 기준 내림차순).

**응답 예시**

```json
{
  "project_id": "bp-cloudpos",
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

특정 담당자의 오픈/진행중 이슈 상세 목록 반환. 기존 프로젝트 이슈 캐시를 재사용하여 추가 Redmine API 호출 없음.

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `user_id` | int (선택) | 담당자 ID |
| `unassigned` | bool (선택) | `true`면 미할당 이슈만 반환 |
| `project_id` | string (선택) | 조회할 프로젝트 ID |

**응답 예시**

```json
{
  "project_id": "bp-cloudpos",
  "user_id": 23,
  "user_name": "이관규",
  "total": 3,
  "overdue_count": 1,
  "issues": [
    {
      "id": 25,
      "subject": "POS 배포 관리 I/F 연동 개발",
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

## 설정 파일 가이드

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

### 주요 설정 항목 설명

| 항목 | 설명 | 기본값 |
|---|---|---|
| `redmine.page_size` | 페이지당 이슈 수 (Redmine 최대 100) | `100` |
| `dashboard.default_project` | 기본 조회 프로젝트 identifier | 필수 |
| `dashboard.include_subprojects` | 하위 프로젝트 이슈 포함 여부 | `false` |
| `dashboard.cache_ttl_seconds` | 캐시 유효 시간 (초) | `300` |
| `dashboard.status_groups` | 상태 ID → 그룹 매핑 (Redmine 어드민에서 ID 확인) | 필수 |
| `stale_rule.days_without_update` | 장기 미업데이트 기준일 | `14` |

> **`status_groups` ID 확인 방법**: Redmine 어드민 → 이슈 추적 → 상태 메뉴에서 각 상태의 숫자 ID를 확인 후 그룹에 배치.

---

## 현재 개발 현황

### ✅ 완료 (MVP v0.1)

| 항목 | 상태 | 비고 |
|---|---|---|
| FastAPI 앱 구조 (4계층 분리) | 완료 | api / service / client / core |
| config.json 기반 설정 로드 | 완료 | `lru_cache` 싱글턴 |
| TTL 인메모리 캐시 | 완료 | `asyncio.Lock` 기반 동시성 보호 |
| Redmine 비동기 클라이언트 | 완료 | `httpx.AsyncClient` + 페이지네이션 자동 처리 |
| `GET /dashboard/summary` | 완료 | 상태 그룹별 이슈 수, overdue 수 |
| `GET /dashboard/projects` | 완료 | N+1 없는 프로젝트별 이슈 집계 |
| `GET /dashboard/issues/overdue` | 완료 | 기한 초과 이슈 목록 |
| `GET /dashboard/workload` | 완료 | 담당자별 open / overdue 이슈 수 |
| `?project_id=` 오버라이드 | 완료 | 전 엔드포인트 지원 |
| 하드코딩 없는 상태 분류 | 완료 | config의 `status_groups` 참조 |
| Swagger UI 자동 생성 | 완료 | `/docs` |
| 실제 Redmine API 연결 확인 | 완료 | `bp-cloudpos` 프로젝트 응답 검증 |

### ✅ 완료 (v0.2 — 프론트엔드 + 담당자 상세)

| 항목 | 상태 | 비고 |
|---|---|---|
| Next.js + TypeScript 프론트엔드 | 완료 | App Router, Tailwind CSS |
| 요약 카드 (전체/오픈/완료/초과) | 완료 | 4개 색상 카드 |
| 기한 초과 이슈 테이블 | 완료 | 초과일 기준 색상 코딩 |
| 담당자별 워크로드 바 차트 | 완료 | CSS 기반, 라이브러리 미사용 |
| 프로젝트 선택 드롭다운 | 완료 | 프로젝트 변경 시 전체 데이터 재조회 |
| `GET /dashboard/workload/member` | 완료 | 담당자별 오픈/진행중 이슈 상세 |
| 담당자 클릭 → 모달 팝업 | 완료 | 전체 일감 표시, 기한초과 하이라이트 |
| Redmine 이슈 직접 링크 | 완료 | 모달 내 제목 클릭 시 Redmine 이동 |
| 모달 UX (ESC, 배경 클릭, 애니메이션) | 완료 | body 스크롤 잠금 포함 |
| API 프록시 (Next.js rewrites) | 완료 | CORS 불필요 |

### ✅ 완료 (v0.3 — 라우팅 분리 + UI/UX 전면 개선)

| 항목 | 상태 | 비고 |
|---|---|---|
| 프로젝트 선택 초기 화면 (`/`) | 완료 | 카드 그리드, open 이슈 수 표시 |
| 프로젝트별 대시보드 라우팅 (`/dashboard/[projectId]`) | 완료 | URL 기반 프로젝트 ID, 뒤로가기 지원 |
| DashboardView 컴포넌트 분리 | 완료 | page.tsx에서 데이터 로직 분리 |
| KPI 카드 재구성 | 완료 | 전체→진행 중 교체, 기한초과 highlight, Closed에 처리율% 표시 |
| 기한 초과 0건 시 영역 축소 | 완료 | 빈 카드 대신 카드 내 안내 문구로 대체 |
| 3컬럼 레이아웃 | 완료 | 워크로드(1/3 좌) + 기한초과(2/3 우), 레이아웃 고정 |
| 이슈 상태 분포 바 추가 | 완료 | by_status_group 데이터 재활용, 순수 Tailwind CSS |
| WorkloadBar open/overdue 스택 바 | 완료 | overdue 구간 적색, open 나머지 청색 |
| OverdueTable 컬럼 정리 | 완료 | ID를 제목에 인라인 병합, 불필요 컬럼 제거 |

---

## 알려진 한계

### 인메모리 캐시 한계

| 한계 | 영향 | 최소화 방법 |
|---|---|---|
| **프로세스 재시작 시 캐시 소멸** | 재시작 직후 첫 요청은 항상 Redmine API 직접 호출 | 서버 재시작을 최소화 (운영 환경) |
| **멀티 워커 캐시 공유 불가** | `--workers 4` 시 워커마다 독립 캐시 → 메모리 4배 사용 + Redmine API 호출 4배 | **단일 워커 운영 권장** (`--workers 1`) |
| **메모리 상한 없음** | 장시간 운영 시 캐시 항목 누적 가능 | TTL 만료 항목 주기적 정리 (향후 구현 예정) |

### KPI 한계 (현재 계산 불가)

| KPI | 이유 |
|---|---|
| **이번 주 해결된 이슈 수** | Redmine 기본 API는 현재 상태만 반환. `closed_on` 필드 없음 |
| **평균 해결 시간 (MTTR)** | 이슈 생성~완료 시간 추적 불가. Journals API 개별 조회 필요 (N+1 발생) |
| **일별 번다운 차트** | 날짜별 스냅샷 없이 추이 계산 불가 |
| **개인별 처리 속도** | 이슈 완료 담당자 추적 불가 (Journals 분석 필요) |

---

## 향후 개발 계획

### Phase 1 — 안정성 및 UX 개선 (단기)

| 항목 | 상세 |
|---|---|
| **캐시 수동 무효화 엔드포인트** | `DELETE /api/v1/cache?key=summary:bp-cloudpos` 추가. 데이터 갱신 없이 캐시를 즉시 초기화 |
| **만료 항목 자동 정리** | `asyncio` background task로 60초마다 `evict_expired()` 실행. 장시간 운영 시 메모리 누수 방지 |
| **에러 응답 표준화** | httpx 타임아웃, Redmine 401/403 등을 FastAPI `HTTPException`으로 일관성 있게 변환 |
| **캐시 통계 엔드포인트** | `GET /api/v1/cache/stats` — 현재 캐시 적중률, 항목 수, 만료 항목 수 반환 (운영 모니터링용) |
| **Redmine 상태 자동 조회** | 앱 시작 시 `GET /issue_statuses.json` 호출 → 상태명-ID 매핑 자동 생성. config의 `status_groups` 수동 입력 부담 완화 |

### Phase 2 — 기능 확장 (중기)

| 항목 | 상세 |
|---|---|
| **스테일 이슈 목록** | `GET /api/v1/dashboard/issues/stale` — `updated_on` 기준 N일 이상 변경 없는 이슈 목록. config의 `stale_rule` 활용 |
| **우선순위별 이슈 분포** | `GET /api/v1/dashboard/priority-distribution` — High/Normal/Low 분포 |
| **버전(마일스톤)별 진행률** | `GET /api/v1/dashboard/versions` — Redmine 버전(`/versions.json`) 기반 완료율 |
| **다중 프로젝트 비교** | `GET /api/v1/dashboard/summary?project_id=A,B,C` — 쉼표 구분 다중 프로젝트 지원 |
| **백그라운드 프리패치** | 앱 시작 시 기본 프로젝트 이슈를 미리 캐시 워밍업. 첫 요청 응답 지연 제거 |

### Phase 3 — 히스토리 및 트렌드 (중기, DB 없이 제한적 구현)

| 항목 | 상세 | 한계 |
|---|---|---|
| **인메모리 일별 스냅샷** | 매일 자정 `asyncio` 타이머로 summary를 `app.state.snapshots`에 누적 저장 | 서버 재시작 시 소멸. 수일치 데이터만 유지 가능 |
| **주간 트렌드 API** | `GET /api/v1/dashboard/trend` — 최근 7일 누적 스냅샷 기반 open 이슈 추이 | 재시작 전 데이터 없음 명시 필요 |

### Phase 4 — 인프라 확장 (장기, DB 도입 시)

현재 구조는 `services/` 계층이 `client/`에서 데이터를 받아 처리하도록 명확히 분리되어 있음.  
DB 도입 시 `client/` 옆에 `repository/` 계층만 추가하면 되며, **서비스 로직 변경 없이** 데이터 소스를 교체 가능.

```
현재 (MVP):
  service → client (Redmine API 실시간 조회)

DB 도입 후:
  service → repository (DB 조회)
              ↑
  별도 동기화 워커 → client (Redmine API 주기적 동기화)
```

| 항목 | 상세 |
|---|---|
| **PostgreSQL + SQLAlchemy** | 이슈 스냅샷 영구 저장. 재시작 후에도 트렌드 데이터 유지 |
| **멀티 워커 운영** | DB 기반 캐시(Redis) 또는 공유 캐시 도입으로 `--workers N` 지원 |
| **웹훅 수신** | Redmine 웹훅으로 이슈 변경 이벤트 수신 → 캐시 즉시 무효화 (Polling 방식 제거) |
| **인증/권한 제어** | API Key 미들웨어 또는 JWT 기반 접근 제어 추가 |

---

## 버전 히스토리

| 버전 | 날짜 | 내용 |
|---|---|---|
| v0.2.0 | 2026-04-02 | 프론트엔드(Next.js) 추가, 담당자별 이슈 상세 API + 모달 UI |
| v0.1.0 | 2026-04-02 | MVP 초기 구현: 4계층 구조, 4개 엔드포인트, 인메모리 캐시 |
