# Redmine Dashboard

Redmine REST API 기반 이슈 현황 대시보드.
DBRedis 없이 인메모리 TTL 캐시만으로 구동되는 풀스택 MVP.
**FastAPI 백엔드 + Next.js 프론트엔드** 구성.

---

## 목차

1. [개요](#개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [아키텍처 및 계층 설명](#아키텍처-및-계층-설명)
5. [실행 방법](#실행-방법)
6. [화면 구성](#화면-구성)
7. [API 엔드포인트](#api-엔드포인트)
8. [설정 파일 가이드](#설정-파일-가이드)
9. [버전 히스토리](#버전-히스토리)
10. [알려진 한계](#알려진-한계)
11. [향후 개발 계획](#향후-개발-계획)

---

## 개요

Redmine 프로젝트 관리 시스템의 이슈 데이터를 실시간으로 집계하여 운영 대시보드 형태로 시각화하는 풀스택 시스템.

- **데이터 소스**: Redmine REST API (직접 호출, 페이지네이션 자동 처리)
- **캐시**: 프로세스 내 TTL 딕셔너리 캐시 (DB / Redis 불필요)
- **라우팅**: `/` 프로젝트 선택  `/dashboard/[projectId]` 프로젝트별 대시보드
- **프로젝트 전환**: 헤더 드롭다운으로 프로젝트 전환, URL 기반 상태 유지

---

## 기술 스택

### 백엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Python | 3.12+ | 런타임 |
| FastAPI | 0.115.0 | API 프레임워크 |
| Uvicorn | 0.30.0 | ASGI 서버 |
| httpx | 0.27.0 | 비동기 HTTP 클라이언트 (Redmine API 호출) |
| Pydantic v2 | FastAPI 내장 | 응답 스키마 직렬화/검증 |

### 프론트엔드

| 항목 | 버전 | 용도 |
|---|---|---|
| Next.js | 14.2.0 | React 프레임워크 (App Router) |
| React | 18.3+ | UI 렌더링 |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 3.4+ | 스타일링 (외부 차트 라이브러리 미사용) |

---

## 프로젝트 구조

```
dashboard/
 config.json                         Redmine 연결 정보 및 대시보드 설정
 requirements.txt                    Python 패키지 목록

 app/                                FastAPI 백엔드
    main.py                         앱 진입점, lifespan, 글로벌 예외 핸들러
    core/
       config.py                   config.json 파싱  Settings 싱글턴 (lru_cache)
       cache.py                    TTL 인메모리 캐시 (asyncio.Lock 기반)
    client/
       redmine_client.py           httpx 비동기 클라이언트 + 페이지네이션
    services/
       utils.py                    공통 유틸 (calc_overdue 등)
       issue_service.py            이슈 집계/요약/overdue 비즈니스 로직
       project_service.py          프로젝트 목록 + 이슈 수 집계
       workload_service.py         담당자별 워크로드 + 멤버 이슈 상세
    api/
       v1/
           router.py               v1 라우터 통합 등록
           dashboard.py            5개 대시보드 엔드포인트
           deps.py                 FastAPI Depends 의존성 주입 함수
    schemas/
        dashboard.py                Pydantic 응답 모델 정의

 frontend/                           Next.js 프론트엔드
     next.config.mjs                 API 프록시 설정 (rewrites: /api/v1/*  :8000)
     tailwind.config.ts              Tailwind 설정 + 모달 애니메이션 keyframe
     postcss.config.js
     package.json
     src/
         app/
            layout.tsx              루트 레이아웃
            globals.css             Tailwind 전역 스타일
            page.tsx                프로젝트 선택 페이지 (/)
            dashboard/
                [projectId]/
                    page.tsx        프로젝트별 대시보드 (/dashboard/:id)
         components/
            DashboardView.tsx       대시보드 본체: 데이터 조회 + 3컬럼 렌더링
            SummaryCard.tsx         KPI 카드 (highlight / subtitle prop 지원)
            OverdueTable.tsx        기한 초과 이슈 테이블 (0건 시 숨김)
            WorkloadBar.tsx         워크로드 바 (open/overdue 스택 색상 구분)
            ProjectSelect.tsx       프로젝트 전환 드롭다운
            MemberModal.tsx         담당자 이슈 상세 모달
         lib/
            api.ts                  API 호출 함수 모음
         types/
             dashboard.ts            TypeScript 타입 정의 (백엔드 스키마와 1:1)
```

---

## 아키텍처 및 계층 설명

### 데이터 흐름

```
브라우저 (Next.js)
      fetch /api/v1/*
    
Next.js rewrites           CORS 없이 프록시 (/api/v1/*  localhost:8000)
    
    
api/v1/dashboard.py        요청 수신, 파라미터 검증, Pydantic 직렬화
      service 호출
    
services/                  비즈니스 로직, 캐시 조회/저장, overdue 판단
      캐시 미스 시
    
client/redmine_client.py   Redmine API 호출, 자동 페이지네이션
    
    
Redmine REST API (외부)
```

### 백엔드 계층 원칙

| 계층 | 역할 | 금지 사항 |
|---|---|---|
| `api/` | HTTP 수신, Pydantic 직렬화 | 비즈니스 로직 |
| `services/` | 집계, 필터, overdue 판단, 캐시 관리 | HTTP 직접 호출 |
| `services/utils.py` | 여러 서비스에서 공유하는 순수 함수 (`calc_overdue`) | 상태 보유 |
| `client/` | Redmine API 호출, 페이지네이션 처리 | 비즈니스 판단 |
| `core/` | 설정 파싱, 캐시 인프라 | 도메인 의존 |

### 캐시 전략

- 캐시 키: `issues:{project_id}` — `IssueService`와 `WorkloadService`가 동일 키 공유
- `WorkloadService`는 `IssueService`와 동일한 캐시 키를 사용하여 중복 Redmine API 호출 방지
- TTL 만료 시 다음 요청에서 자동 갱신 (lazy refresh)

---

## 실행 방법

### 1. 백엔드 패키지 설치

```bash
pip install -r requirements.txt
```

### 2. 설정 확인

`config.json`의 Redmine 연결 정보와 `status_groups` ID 값이 실제 Redmine 인스턴스와 일치하는지 확인.

> **중요**: `status_groups`의 숫자 ID는 Redmine 어드민  이슈 추적  상태 메뉴에서 확인.

### 3. 백엔드 서버 실행

```bash
# 개발 환경 (파일 변경 시 자동 리로드)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 운영 환경 (인메모리 캐시 공유 이슈로 단일 워커 권장)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.
`next.config.mjs`의 rewrites 설정으로 `/api/v1/*` 요청이 백엔드(8000)로 자동 프록시됩니다.

### 5. API 문서 (백엔드 자동 생성)

| URL | 설명 |
|---|---|
| http://localhost:8000/docs | Swagger UI (인터랙티브 테스트) |
| http://localhost:8000/redoc | ReDoc 문서 |
| http://localhost:8000/health | 헬스체크 |

---

## 화면 구성

### `/` — 프로젝트 선택 페이지

- 접근 가능한 전체 프로젝트를 카드 그리드로 표시
- 각 카드에 프로젝트명 + open 이슈 수 표시
- 카드 클릭 시 `/dashboard/[projectId]`로 이동

### `/dashboard/[projectId]` — 프로젝트 대시보드

```

   뒤로    Redmine Dashboard          [프로젝트 전환 ]    헤더
  전체 이슈 123건                       기준 시각: ...    

  Open     진행 중   기한초과    Closed                    KPI (4개 카드)
   12         5      ❗ 3       45건  처리율 37%       

  1/3 좌측 패널    2/3 우측 패널 
   담당자별 워크로드             기한 초과 이슈 (3건)      메인 콘텐츠
   김OO ██🔴░ 8(2)             #123 제목...  +5일      
   이OO ███░░ 6                #456 제목...  +3일      
                                #789 제목...  +1일      
     * 0건이면 '없음' 안내   
   이슈 상태 분포              
   ████████░░░░░░                                          
    Open 12(20%)                                          
    진행 5(8%)                                            
    Closed 45(72%)                                        
                                

```

**인터랙션:**
- 담당자 행 클릭  해당 담당자의 오픈/진행 중 이슈 목록 모달
- 기한 초과 이슈 제목 클릭  Redmine 이슈 페이지로 이동 (새 탭)
- 헤더 드롭다운  프로젝트 전환 (URL 변경)

---

## API 엔드포인트

모든 엔드포인트는 선택적 `?project_id=` 쿼리 파라미터를 지원합니다.
미지정 시 `config.json`의 `default_project` 값을 사용합니다.

---

### `GET /api/v1/dashboard/summary`

이슈 전체 요약 통계.

**응답 예시**

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

**응답 예시**

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

**응답 예시**

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

**응답 예시**

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

특정 담당자의 오픈/진행중 이슈 상세 목록. 기존 캐시(`issues:{project_id}`)를 재사용하여 추가 Redmine API 호출 없음.

**쿼리 파라미터**

| 파라미터 | 타입 | 설명 |
|---|---|---|
| `user_id` | int (선택) | 담당자 Redmine 사용자 ID |
| `unassigned` | bool (선택) | `true`면 미할당 이슈만 반환 |
| `project_id` | string (선택) | 프로젝트 ID |

**응답 예시**

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

### 주요 설정 항목

| 항목 | 설명 | 기본값 |
|---|---|---|
| `redmine.page_size` | 페이지당 이슈 수 (Redmine 최대 100) | `100` |
| `dashboard.default_project` | 기본 조회 프로젝트 identifier | 필수 |
| `dashboard.include_subprojects` | 하위 프로젝트 이슈 포함 여부 | `false` |
| `dashboard.cache_ttl_seconds` | 캐시 유효 시간 (초) | `300` |
| `dashboard.status_groups` | 상태 ID  그룹 매핑 | 필수 |
| `overdue_rule.exclude_status_groups` | overdue 판단에서 제외할 상태 그룹 | `["closed"]` |

> **`status_groups` ID 확인**: Redmine 어드민  이슈 추적  상태 메뉴에서 각 상태의 ID 확인 후 그룹에 배치.

---

## 버전 히스토리

### v0.3 — 라우팅 분리 + 코드 품질 + UI/UX 전면 개선 (2026-04-02)

**라우팅 및 컴포넌트 구조 개편**
- 프로젝트 선택 초기 화면 추가 (`/`) — 카드 그리드, open 이슈 수 표시
- 프로젝트별 대시보드를 `/dashboard/[projectId]`로 분리 — URL 기반 상태, 뒤로가기 지원
- `DashboardView` 컴포넌트 신설 — `page.tsx`에서 데이터 조회 로직 분리

**백엔드 버그 수정 및 코드 품질**
- `subproject_id` 파라미터 동작 수정 — `include_subprojects=false`일 때만 `"!*"` 추가되도록 조건 분기
- 글로벌 예외 핸들러 추가 (`main.py`) — 처리되지 않은 예외 시 JSON 500 응답 보장
- `services/utils.py` 신설 — `calc_overdue()` 함수를 `IssueService`/`WorkloadService` 양쪽에서 공유
- `WorkloadService` 캐시 중복 제거 — `IssueService`와 동일한 캐시 키(`issues:{pid}`) 재사용

**UI/UX 개선**
- KPI 카드 재구성: "전체 이슈" 제거  "진행 중(`in_progress`)" 추가, 전체 이슈 수는 보조 정보 라인으로 이동
- Closed 카드에 처리율(%) 표시 (`subtitle` prop 추가)
- 기한 초과 카드: `overdue > 0`이면 배경 강조 (`highlight` prop)
- 3컬럼 고정 레이아웃 — 워크로드(좌 1/3) + 기한초과(우 2/3), 건수 유무와 무관하게 고정
- 이슈 상태 분포 비율 바 추가 — `by_status_group` 데이터 재활용, 순수 Tailwind CSS
- `WorkloadBar` 스택 바 — overdue 구간 적색, 나머지 open 청색으로 색상 분리
- `OverdueTable` 컬럼 정리 — ID를 제목에 인라인 병합, 5컬럼으로 축소
- 기한 초과 0건 시 테이블 숨김 — 카드 내 "없음" 안내 문구로 대체
- 기한 초과 이슈 제목에 Redmine 직접 링크 추가 (`url` 필드 활용)

---

### v0.2 — 프론트엔드 + 담당자 상세 (2026-04-02)

- Next.js + TypeScript + Tailwind CSS 프론트엔드 구축 (App Router)
- KPI 요약 카드 4개 (전체/Open/Closed/기한초과)
- 기한 초과 이슈 테이블 (초과일 기준 색상 코딩)
- 담당자별 워크로드 바 차트 (CSS 기반, 차트 라이브러리 미사용)
- 프로젝트 선택 드롭다운 (변경 시 전체 데이터 재조회)
- `GET /api/v1/dashboard/workload/member` 엔드포인트 추가
- 담당자 클릭  모달 팝업 (오픈/진행 중 이슈 전체, 기한초과 하이라이트)
- 모달 UX: ESC 닫기, 배경 클릭 닫기, 슬라이드업 애니메이션, body 스크롤 잠금
- Next.js rewrites 프록시 설정 (CORS 불필요)

---

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

## 알려진 한계

### 인메모리 캐시 한계

| 한계 | 영향 | 대응 방법 |
|---|---|---|
| 프로세스 재시작 시 캐시 소멸 | 재시작 직후 첫 요청은 Redmine API 직접 호출 | 서버 재시작 최소화 |
| 멀티 워커 캐시 공유 불가 | `--workers N` 시 워커마다 독립 캐시  호출 N배 | **단일 워커 운영 권장** |
| 메모리 상한 없음 | 장시간 운영 시 만료 항목 누적 가능 | TTL 자동 정리 추후 구현 예정 |

### 현재 API로 계산 불가한 KPI

| KPI | 이유 |
|---|---|
| 이번 주 해결된 이슈 수 | Redmine 기본 API는 현재 상태만 반환 |
| 평균 해결 시간 (MTTR) | Journals API 개별 조회 필요 (N+1) |
| 일별 번다운 차트 | 날짜별 스냅샷 없이 추이 계산 불가 |
| 개인별 처리 속도 | 이슈 완료 담당자 추적 불가 |

---

## 향후 개발 계획

### Phase 1 — 안정성 개선 (단기)

| 항목 | 내용 |
|---|---|
| 캐시 수동 무효화 | `DELETE /api/v1/cache?key=...` 엔드포인트 |
| 만료 항목 자동 정리 | `asyncio` background task, 60초 주기 |
| Redmine 상태 자동 조회 | 앱 시작 시 `GET /issue_statuses.json`  상태 ID 자동 매핑 |
| 캐시 통계 엔드포인트 | `GET /api/v1/cache/stats` — 적중률, 항목 수 |

### Phase 2 — 기능 확장 (중기)

| 항목 | 내용 |
|---|---|
| 스테일 이슈 목록 | `GET /api/v1/dashboard/issues/stale` — N일 이상 미업데이트 이슈 |
| 우선순위별 분포 | High/Normal/Low 이슈 수 집계 |
| 버전(마일스톤)별 진행률 | Redmine `/versions.json` 기반 완료율 |
| 자동 새로고침 | n분 간격 polling (useInterval) |

### Phase 3 — 히스토리/트렌드 (중기, DB 없이 제한적 구현)

| 항목 | 내용 | 한계 |
|---|---|---|
| 인메모리 일별 스냅샷 | 자정마다 summary를 `app.state`에 누적 | 재시작 시 소멸 |
| 주간 트렌드 API | 최근 7일 스냅샷 기반 open 추이 | 재시작 전 데이터 없음 |

### Phase 4 — 인프라 확장 (장기, DB 도입 시)

현재 `services/` 계층은 `client/`를 통해 데이터를 받는 구조로 명확히 분리되어 있어,
DB 도입 시 `repository/` 계층만 추가하면 **서비스 로직 변경 없이** 데이터 소스를 교체할 수 있습니다.

```
현재 (MVP):  service  client (Redmine 실시간 조회)

DB 도입 후:  service  repository (DB 조회)
                            
             동기화 워커  client (Redmine 주기적 동기화)
```

| 항목 | 내용 |
|---|---|
| PostgreSQL + SQLAlchemy | 이슈 스냅샷 영구 저장 |
| Redis 캐시 | 멀티 워커 캐시 공유, `--workers N` 지원 |
| Redmine 웹훅 수신 | 이슈 변경 이벤트  캐시 즉시 무효화 |
| 인증/권한 제어 | API Key 미들웨어 또는 JWT |
