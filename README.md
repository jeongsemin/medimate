# MediMate

**Honest, receipt-verified reviews of Korean hospitals and dermatology clinics, written by real patients for travelers.**
Available in English, 日本語, 中文 and 한국어.

한국을 여행하는 외국인을 위한 병원·피부과 리뷰 서비스입니다. 영수증으로 방문을 인증한 사용자만 리뷰를 쓸 수 있고,
영어 사용 여부·원장 직접 상담 같은 여행자가 궁금해하는 항목을 함께 남길 수 있습니다.

> **상태:** 핵심 화면과 서버 로직이 구현되어 있고 단위 테스트 91개가 통과합니다. Google 로그인부터 영수증 업로드 → 승인 → 리뷰 등록 → 삭제까지
> 로컬에서 end-to-end로 확인했습니다. 네이버 검색·CLOVA OCR 키 연결과 배포는 아직입니다. 자세한 내용은 [현재 상태와 한계](#현재-상태와-한계)를 보세요.

## 주요 기능

| 기능 | 설명 |
|---|---|
| 병원 검색 | 네이버 지도 검색으로 병원·피부과를 찾고, 찾은 병원은 DB에 저장합니다. 지역·진료 칩과 인기 검색어 제공 |
| 검색·비교 | 평점, 리뷰 수, 영어·원장 상담 여부로 필터·정렬하고 최대 3곳을 나란히 비교합니다 |
| 영수증 인증 | 영수증 사진을 올리면 OCR로 병원명·날짜·금액을 대조해 자동 인증하거나 관리자 검토로 넘깁니다 |
| 리뷰 작성 | 별점, 방문 시기, 진료/시술, 후기(100~2,000자)와 영어 지원·통역·원장 상담·가격 안내·강요 없음 항목 |
| 병원 상세 | 병원 정보, 네이버·구글 지도 링크, 리뷰 기반 외국어 지원 집계, 필터·정렬되는 인증 리뷰 |
| 마이페이지 | 영수증 인증 현황(반려 사유 포함), 내가 쓴 리뷰 삭제, 닉네임 수정, 국가·연령대·성별 선택 입력(비공개) |
| 관리자 | 자동 인증되지 않은 영수증을 원본 이미지와 OCR 결과로 비교해 승인·반려. 이메일로 관리자 추가·해제 |
| 회원 관리 | 가입자 전체 목록과 회원 수, 필터(이름·이메일, 상태, 국가, 연령대, 성별, 가입일), 체크박스로 일괄 정지·해제. 정지되면 영수증 업로드·리뷰 작성이 막히고 기존 리뷰는 숨겨집니다 |
| 4개 언어 | `/en` `/ja` `/zh` `/ko`. 브라우저 언어로 자동 이동, 언어별 SEO 메타데이터(hreflang) |

## 화면과 경로

| 경로 | 설명 | 로그인 |
|---|---|---|
| `/[lang]` | 홈 (검색, 지역·진료 카드, 최근 인증 리뷰) | 불필요 |
| `/[lang]/search` | 검색·필터·비교 | 불필요 |
| `/[lang]/hospitals/[id]` | 병원 상세 | 불필요 |
| `/[lang]/reviews/[id]` | 리뷰 상세 | 불필요 |
| `/[lang]/login` | Google 로그인 | – |
| `/[lang]/hospitals/[id]/review` | 영수증 인증 + 리뷰 작성 | 필요 |
| `/[lang]/my` | 마이페이지 | 필요 |
| `/[lang]/admin` | 영수증 검토, 관리자 지정 | 관리자 |
| `/[lang]/admin/members` | 회원 목록·필터·정지 | 관리자 |
| `/api/receipts` | 영수증 업로드·인증 (POST) | 필요 |
| `/api/hospitals/search` | 병원 검색 (GET) | 불필요 |

읽기·검색은 로그인 없이 가능하고, 영수증 업로드와 리뷰 작성부터 로그인이 필요합니다.

## 기술 스택

- **Next.js 16** (App Router, `proxy.ts`, Turbopack), React 19, TypeScript
- **Tailwind CSS 4**, lucide-react. 디자인은 Figma 시안을 기준으로 구현했습니다
- **Supabase**: Auth(Google), Postgres + Row Level Security, 비공개 Storage
- **네이버 검색 API**(지역 검색), **네이버 CLOVA OCR**(영수증 도메인, 선택)
- 테스트: Node 내장 테스트 러너(`node --test`), 별도 테스트 프레임워크 없음

## 시작하기

**준비물:** Node.js(개발·검증은 v24에서 했습니다. 테스트 러너가 `.ts` 파일을 직접 실행하므로 TypeScript 실행을 지원하는 최신 Node가 필요합니다), Supabase 프로젝트, 네이버 개발자 앱.

```bash
npm install
cp .env.example .env.local   # 값을 채웁니다
npm run dev                  # http://localhost:3000
```

### 1. 환경 변수 (`.env.local`)

| 변수 | 필수 | 설명 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 공개 anon 키 (RLS가 보호) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **서버 전용.** 병원 저장, 영수증 처리, 관리자 화면에서 사용 |
| `NAVER_SEARCH_CLIENT_ID` / `NAVER_SEARCH_CLIENT_SECRET` | 검색 | 네이버 개발자센터 → 검색 API. 없으면 DB에 이미 있는 병원만 검색됩니다 |
| `CLOVA_OCR_INVOKE_URL` / `CLOVA_OCR_SECRET` | 선택 | 없으면 모든 영수증이 수동 검토로 넘어갑니다 |
| `NEXT_PUBLIC_SITE_URL` | 배포 시 | canonical·hreflang·사이트맵의 기준 주소. 기본값 `http://localhost:3000` |

`.env.local`은 git에서 제외됩니다. **키를 저장소에 커밋하지 마세요.**

### 2. 데이터베이스

Supabase **SQL 편집기**에 `supabase/migrations/0001_init.sql`을 붙여넣어 실행합니다. 테이블(`profiles`, `hospitals`,
`receipts`, `reviews`), 조회용 뷰(`hospital_stats`), RLS 정책, 비공개 `receipts` 버킷, 가입 시 프로필을 만드는 트리거가 만들어집니다.

이어서 `supabase/migrations/0002_members.sql`도 **한 번** 실행합니다. 회원 정보(`member_details`)와 정지 기록(`suspensions`) 테이블,
정지된 작성자의 리뷰를 숨기는 RLS 정책, 관리자용 회원 목록 함수(`admin_list_members`, 서비스 키만 호출 가능)가 추가됩니다.
같은 파일을 두 번 실행하면 "already exists" 오류가 나는데, 이미 적용됐다는 뜻입니다.

### 3. Google 로그인

1. Google Cloud Console → OAuth 동의 화면 설정 후 **웹 애플리케이션** OAuth 클라이언트를 만들고, 승인된 리디렉션 URI에
   `https://<project-ref>.supabase.co/auth/v1/callback`을 추가합니다.
2. Supabase → Authentication → Providers → **Google**을 켜고 클라이언트 ID·보안 비밀번호를 입력합니다.
3. Supabase → Authentication → URL Configuration에서 Site URL을 `http://localhost:3000`으로,
   Redirect URLs에 `http://localhost:3000/**`를 추가합니다.

클라이언트 보안 비밀번호는 Supabase 화면에만 입력합니다. 앱 코드나 `.env`에는 필요 없습니다.

### 4. 관리자 지정

**첫 관리자**는 한 번 로그인한 뒤 SQL 편집기에서 본인 계정에 권한을 줍니다.

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

그다음부터는 `/admin` 아래쪽 "관리자" 섹션에서 이메일로 다른 사람을 추가·해제합니다(추가할 사람은 한 번 로그인한 적이 있어야 합니다).
마지막 관리자는 해제할 수 없습니다.

## 영수증 인증 방식

`POST /api/receipts`가 다음 순서로 처리합니다.

1. 로그인과 파일을 확인합니다. 클라이언트가 보낸 MIME 타입이 아니라 **파일 첫 바이트**로 JPEG/PNG만 허용하고, 10MB·하루 10장으로 제한합니다.
2. 파일의 SHA-256을 계산해 **같은 사진의 재사용**을 막습니다.
3. 비공개 버킷에 저장하고 CLOVA OCR로 병원명·결제일·금액을 읽습니다.
4. 아래 조건을 **모두** 만족하면 `auto_approved`, 하나라도 어긋나거나 OCR을 쓸 수 없으면 `pending`(관리자 검토)입니다.
   - 병원명 유사도 ≥ 0.6 (문자 bigram Dice 계수, `의원`·`병원`·`(주)` 등 제거 후 비교)
   - 결제일이 오늘 기준 90일 이내이고 미래가 아님
   - 금액을 읽을 수 있음
5. 관리자가 `/admin`에서 원본 이미지와 OCR 결과를 비교해 승인하거나 사유와 함께 반려합니다.

OCR 결과는 신뢰하지 않는 입력으로 다룹니다. 잘못된 날짜(`2026-13-45`), 비정상 금액, 깨진 응답은 업로드를 실패시키지 않고
수동 검토로 보냅니다. 한 영수증으로는 리뷰를 한 번만 쓸 수 있습니다.

## 보안

- **RLS가 최종 방어선입니다.** 리뷰는 *본인의, 같은 병원의, 승인된 영수증*이 있어야만 DB가 받아줍니다. 영수증은 서버(service role)만 쓰고,
  사용자는 자기 영수증만 조회할 수 있습니다.
- **service role 키는 서버에만 있습니다.** 브라우저 번들에 들어가지 않으며 `server-only`로 클라이언트 import를 빌드 단계에서 막습니다.
- **영수증 사진은 비공개 버킷**에 있고 관리자 화면에는 5분짜리 서명 URL로만 노출됩니다. 다른 사용자에게는 절대 공개되지 않습니다.
- **서버 액션은 공개 엔드포인트로 취급**합니다. 관리자 승인·삭제·지정·정지 등은 액션 안에서 권한을 다시 확인합니다.
- **국가·연령대·성별은 공개 테이블에 두지 않습니다.** `profiles`는 누구나 읽을 수 있어서, 선택 입력 정보는 본인만 읽는 `member_details`에 따로 저장합니다. 관리자 회원 목록은 서비스 키로만 호출되는 DB 함수가 만들고, 익명 키로 호출하면 거부됩니다.
- **정지는 DB에서 강제합니다.** 정지 기록은 서버만 쓰고, 정지된 작성자의 리뷰는 RLS가 작성자 본인과 관리자 외에는 보여주지 않으며 새 리뷰도 막습니다. 관리자와 정지를 실행하는 본인은 대상에서 제외됩니다.
- 로그인 이후 이동 주소(`next`)는 같은 사이트의 상대 경로만 허용합니다(open redirect 방지).
- 로그인·마이페이지·관리자·리뷰 작성·검색 결과는 `noindex`입니다.
- `next` 16.4.0은 알려진 취약점이 있어 **16.4.2로 고정**했습니다. `npm audit --omit=dev` 결과 0건입니다.

## 프로젝트 구조

```
src/
  app/
    [lang]/            # 언어별 페이지 (루트 레이아웃이 [lang] 아래에 있음)
      hospitals/[id]/  #   병원 상세, review/ 에 영수증 인증 + 리뷰 작성
      reviews/[id]/    #   리뷰 상세
      search/ my/ admin/ login/   #   admin/members/ 에 회원 관리
      not-found.tsx error.tsx [...rest]/   # 404·오류·미일치 주소
    api/               # 영수증 업로드, 병원 검색
    auth/              # OAuth 콜백, 로그아웃
    robots.ts sitemap.ts
  components/          # 헤더, 푸터, 검색 폼, 상태 화면 등 공용 UI
  i18n/                # 언어 설정, 사전(en/ja/zh/ko), 404·오류 문구
  lib/                 # 도메인 로직 (대부분 순수 함수라 단위 테스트 가능)
    receipt-verify.ts clova-parse.ts receipt-file.ts   # 영수증 인증
    search-params.ts review-input.ts profile-input.ts  # 입력 해석·검증
    admin-roles.ts member-details.ts member-filters.ts # 관리자 지정, 회원 정보·목록 필터
    naver-local.ts hospital-search.ts seo.ts auth.ts supabase/
  proxy.ts             # 언어 라우팅 + Supabase 세션 갱신
supabase/migrations/   # 스키마와 RLS
tests/                 # node --test
```

화면 컴포넌트는 데이터 조회(`page.tsx`)와 표시(`*-view.tsx`)를 나눈 곳이 많아, 로그인 없이도 가짜 데이터로 화면을 확인할 수 있습니다.

## 테스트와 검증

```bash
npm test        # 단위 테스트 (91개)
npm run lint
npm run build
```

테스트는 DB나 네트워크 없이 도는 순수 로직을 대상으로 합니다: 영수증 병원명 대조·날짜·금액 해석, 업로드 파일 판별,
리뷰·닉네임 입력 검증, 검색 필터·정렬·비교 집계, 네이버 응답 해석, SEO 메타데이터, 관리자 지정 규칙, 회원 정보·목록 필터 해석,
4개 언어 문구 키 일치.
CLOVA 응답 샘플은 공식 문서의 구조를 따라 직접 만든 것이며 실제 서비스에서 캡처한 것이 아닙니다.

## 개발 메모 (Next.js 16)

이 프로젝트는 예전 버전과 다른 점이 있어 문서(`node_modules/next/dist/docs/`)를 확인하며 작성했습니다.

- 미들웨어는 `proxy.ts`입니다. 언어 리다이렉트와 Supabase 세션 갱신을 함께 처리합니다.
- `params`/`searchParams`는 Promise입니다. 라우트 타입 `PageProps<"/[lang]/...">`는 `next dev`·`next build` 때 생성됩니다.
- `error.tsx`는 `reset`이 아니라 **`retry`** 를 받습니다. `not-found.tsx`는 props가 없어 언어를 `next/root-params`로 읽습니다.
- `cacheComponents`는 끄고 개발했습니다. 로그인 상태에 따라 달라지는 동적 페이지가 대부분이기 때문입니다.
- Windows PowerShell의 실행 정책이 `npx`를 막으면 `npx.cmd`처럼 `.cmd`를 붙여 실행하세요.

## 현재 상태와 한계

**end-to-end로 검증한 것 (2026-10-27, 로컬 개발 서버 + 실제 Supabase 프로젝트)**
- Google 로그인, 마이페이지, 로그아웃 상태에서의 보호 페이지 접근 차단
- 영수증 업로드(OCR 없음 → `pending`) → 관리자 승인 → 리뷰 등록(RLS) → 병원 상세·리뷰 상세·홈·마이페이지 표시와 집계 → 리뷰 삭제
- 검증용 병원·영수증·리뷰와 관리자 권한은 확인 후 모두 정리했습니다
- 관리자 화면: 이메일 조회와 오류 문구, 회원 목록·통계·필터("미입력" 포함)·잘못된 쿼리 무시, 마이페이지 선택 입력 → 관리자 목록 반영
- 익명 키로 `admin_list_members` 호출과 `member_details` 조회가 막히는지(권한 거부, 0건)

**아직 검증하지 못한 것**
- 실제 정지·해제와 정지된 작성자의 리뷰 숨김. 정지할 다른 회원이 없어 선택 규칙만 단위 테스트로 확인했습니다
- 두 번째 관리자를 실제로 추가·해제하는 흐름과, 회원이 20명을 넘을 때의 페이지 이동
- 실제 CLOVA OCR 응답과 자동 승인(`auto_approved`) 경로. 키가 없어 모든 영수증이 수동 승인 대기로 갑니다. 해석 규칙은 단위 테스트로만 확인했습니다
- 네이버 검색 API로 병원을 새로 불러오는 흐름. 키가 없어 DB에 있는 병원만 검색됩니다
- 배포 환경(실제 도메인의 OAuth 리다이렉트, `NEXT_PUBLIC_SITE_URL`)

**알려진 한계**
- 네이버 지역 검색 API는 한 번에 **최대 5곳**이고 페이지네이션이 없습니다. 목록이 더 필요하면 공공데이터(건강보험심사평가원) 병원 목록을 DB에 적재하는 방법이 있습니다 (아직 적용하지 않았습니다)
- 지도는 네이버·구글 **지도 링크**로만 제공합니다(임베드 지도 없음)
- 리뷰 수정, 후기 제목, 사진 첨부, 신고, 병원 저장은 없습니다 (DB 스키마·저장소 설계가 필요해서 제외했습니다)
- Supabase 무료 플랜은 일주일 정도 쓰지 않으면 프로젝트가 일시중지됩니다

## 디자인 노트

Figma 시안을 기준으로 구현했지만, 시안은 **가상의 병원·가격·리뷰를 담은 UI 콘셉트**이고 이 서비스는 실제 데이터와 영수증 인증을 다루므로
다음은 의도적으로 다르게 만들었습니다.

- 시술 가격, 예약, 광고, 병원 사진·소개글·운영시간은 데이터가 없어 제외했습니다. 시안의 "리뷰 많은 병원"·"최신 리뷰"는 가짜 대신 **실제 DB 데이터**로 채우고, 없으면 섹션을 숨깁니다
- 시안의 "방문 인증을 뜻하지 않아요" 같은 문구는 영수증 인증 서비스와 모순되어 "영수증으로 방문을 인증해요"로 바꿨습니다
- 시안에 없는 **영수증 인증 단계**, **영어·원장 상담 카테고리**, **마이페이지의 영수증 현황**, **관리자 화면**은 서비스 요구사항에 맞춰 같은 디자인 시스템으로 추가했습니다
- 디자인 토큰(색, 라운드, 서체)은 `src/app/globals.css`에 있고, 서체는 Inter와 Noto Sans KR/JP/SC입니다
