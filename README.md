# AI UI 비교 실험 — 배포 가이드

GitHub Pages + Google Sheets(Apps Script) 조합으로 실험을 운영하는 방법을 단계별로 안내합니다.
중간에 한 단계라도 막히면 마지막 **자주 발생하는 문제** 섹션을 먼저 확인해 주세요.

---

## 운영 방식 개요

본 사이트는 **참가자에게 어떤 URL을 보내는지에 따라** Type A 또는 Type B 조건으로 강제 배정됩니다.

| 파일 | URL 예시 | 배정 조건 |
|---|---|---|
| `typeA.html` | `https://...github.io/repo/typeA.html` | **Type A** (기존 UI) |
| `typeB.html` | `https://...github.io/repo/typeB.html` | **Type B** (단계적 출력 + 투명도) |

두 그룹의 참가자에게 각각 다른 URL을 안내해서 모집하시면 됩니다.
(예: 짝수 학번 → typeA.html, 홀수 학번 → typeB.html)

---

## 0. 준비물

- GitHub 계정 (https://github.com/)
- Google 계정 (Google Sheets 사용용)
- 본 폴더 (`experiment_site/`)의 다음 파일들
  - `typeA.html`
  - `typeB.html`
  - `styles.css`
  - `experiment.js`
  - `stimuli.js`
  - `google-apps-script.gs` *(사이트에 업로드하지 않습니다. Apps Script 편집기에 붙여넣을 용도)*

---

## 1. Google Sheets + Apps Script 설정

### 1-1. 응답 저장용 스프레드시트 만들기

1. https://sheets.google.com 접속 → **빈 스프레드시트** 생성
2. 좌상단 파일명을 `AI_UI_experiment_responses` 등으로 변경
3. 시트 탭 이름은 그대로 두어도 됩니다 (Apps Script가 첫 시트를 자동 사용)

### 1-2. Apps Script 코드 붙여넣기

1. 시트 상단 메뉴 → **확장 프로그램 → Apps Script** 클릭
2. 새 창이 열리면 기본으로 들어있는 `function myFunction() { ... }` 코드를 **모두 삭제**
3. 본 폴더의 `google-apps-script.gs` 파일을 텍스트 에디터로 열고, 전체 내용을 복사하여 Apps Script 편집기에 붙여넣기
4. 좌상단 디스크 아이콘(또는 `Ctrl+S`)으로 저장. 프로젝트 이름을 `AI_UI_experiment` 등으로 지정

### 1-3. 웹 앱으로 배포

1. Apps Script 화면 우상단 **배포** → **새 배포** 클릭
2. 톱니바퀴(⚙) 아이콘 → **웹 앱** 선택
3. 다음과 같이 입력
   - 설명: `v1` (이후 코드 수정 시 v2, v3 으로 갱신)
   - 다음 사용자 인증: **나** (본인 Google 계정)
   - **액세스 권한**: **모든 사용자** ← *중요. "Google 계정 사용자"가 아닌 "모든 사용자" 로 설정해야 외부에서 POST 가능합니다.*
4. **배포** 클릭 → 권한 승인 화면이 뜨면 본인 Google 계정으로 인증
   - "이 앱은 Google에서 확인하지 않았습니다" 경고가 뜨면 **고급 → 안전하지 않은 페이지로 이동 → 허용**
5. 배포 완료 후 표시되는 **웹 앱 URL** 을 복사
   - 형식: `https://script.google.com/macros/s/AKfycb..../exec`

### 1-4. 헬스 체크

- 위 URL을 브라우저 주소창에 붙여넣어 접속했을 때
  ```
  {"status":"ok","message":"AI UI experiment endpoint is alive."}
  ```
  이 보이면 정상 배포된 것입니다.

---

## 2. 웹 앱 URL을 experiment.js 에 적용

1. `experiment.js` 를 텍스트 에디터로 열기
2. 상단 `CONFIG` 객체에서 다음 줄을 찾아 1-3 에서 복사한 URL로 교체

```js
const CONFIG = {
  WEB_APP_URL: 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE',  // ← 여기를 교체
  ...
};
```

3. 저장

---

## 3. GitHub 저장소 + GitHub Pages 배포

### 3-1. 저장소 생성

1. https://github.com 로그인 → 우상단 **+** → **New repository**
2. Repository name: `ai-ui-experiment` (자유롭게)
3. **Public** 선택 (Private 은 무료 플랜에서 GitHub Pages 불가)
4. README 등 추가 옵션은 모두 비워두고 **Create repository**

### 3-2. 파일 업로드

1. 만들어진 저장소 화면에서 **uploading an existing file** 링크 클릭
2. 본 폴더(`experiment_site/`) 의 다음 5개 파일을 드래그하여 업로드
   - `typeA.html`
   - `typeB.html`
   - `styles.css`
   - `experiment.js` *(웹앱 URL이 적용된 버전)*
   - `stimuli.js`
3. `google-apps-script.gs` 와 `README.md` 는 사이트 작동과 무관하므로 업로드하지 않아도 됩니다.
4. 페이지 하단 **Commit changes** 클릭

### 3-3. GitHub Pages 활성화

1. 저장소 상단 메뉴 **Settings** 클릭
2. 좌측 메뉴 **Pages** 선택
3. **Build and deployment** 섹션
   - Source: **Deploy from a branch**
   - Branch: **main** / 폴더: **/(root)**
4. **Save**
5. 1~2분 후 같은 페이지 상단에 다음 형태의 URL이 표시됨
   ```
   Your site is live at https://<사용자명>.github.io/ai-ui-experiment/
   ```
6. 참가자에게 보낼 **실험 URL**
   - Type A 그룹: `https://<사용자명>.github.io/ai-ui-experiment/typeA.html`
   - Type B 그룹: `https://<사용자명>.github.io/ai-ui-experiment/typeB.html`
7. (선택) 루트 URL(`/`)에 접속하면 GitHub Pages 의 기본 404 화면이 뜹니다. 안내 페이지를 별도로 두고 싶으면 새 `index.html` 을 추가하여 두 링크를 모아두실 수 있습니다.

---

## 4. 동작 확인

1. 본인이 `typeA.html` URL 로 접속하여 끝까지 진행 → Google Sheets 에 행 추가, `ui_condition=A` 인지 확인
2. 본인이 `typeB.html` URL 로 접속하여 끝까지 진행 → 새 행이 추가되며 `ui_condition=B` 인지 확인
3. 청크가 한 글자씩 흘러나오는 LLM 타이핑 효과가 잘 보이는지, 응답 버튼이 일정 시간 후 활성화되는지 확인

---

## 5. 실험 데이터 다운로드

1. Google Sheets 에서 **파일 → 다운로드 → 쉼표로 구분된 값(.csv)** 또는 **Microsoft Excel(.xlsx)**
2. 분석 도구(R, Python, SPSS 등)로 불러와 사용

### 데이터 컬럼 안내

| 컬럼명 | 의미 |
|---|---|
| `timestamp` | 응답 완료 시각 (KST, `YYYY-MM-DD HH:mm:ss`) |
| `participant_id` | 참가자 ID (자동 생성) |
| `ui_condition` | `A` 또는 `B` |
| `age` | 연령 |
| `ai_usage_frequency` | 1(거의 안 함) ~ 5(거의 매일) |
| `nfc_1` ~ `nfc_5` | NFC 5문항 (각 1~5). **모두 긍정문(정채점)** — 역채점 항목 없음. 출처: 단축형 인지욕구척도 K-NfC-S(김완석, 2007) |
| `stimulus_order` | 제시 순서, 예: `S2,N1,S3,N3,S1,N2` |
| `{ID}_response` | `yes` (활용함) / `no` (활용 안 함) |
| `{ID}_total_time_ms` | 자극 노출~응답 클릭 총 시간 (타이핑 시간 포함) |
| `{ID}_chunk_times` | Type B 청크별 시간, `\|` 구분. 예: `5200\|8100\|6500\|9800`. Type A 는 빈 값. |
| `tlx_mental_demand`, `tlx_effort`, `tlx_frustration` | 1~7 |
| `interview_1` | 신뢰 판단 기준 (객관식 1개 선택: `출처` / `구체적 수치` / `논리 흐름` / `기타: {직접입력}`) |
| `interview_2`, `interview_3` | 자유응답 |
| `total_duration_ms` | 실험 전체 소요 시간 |

> **분석 시 참고**: `total_time_ms` 와 `chunk_times` 에는 LLM 타이핑 효과 동안의 시간도 포함되어 있습니다. 글자당 약 18ms (기본값) × 청크 글자수 만큼의 고정 비용이 발생합니다. 순수 "사용자 사고 시간"이 필요하면 타이핑 시간을 차감해서 사용하세요. `experiment.js` 의 `TYPING_SPEED_MS_PER_CHAR` 값을 조정하여 속도를 바꿀 수 있습니다.

---

## 6. 자주 발생하는 문제

### 1) 시트에 데이터가 안 들어와요

- **체크 1**: Apps Script 웹앱 URL을 브라우저로 직접 열었을 때 `{"status":"ok",...}` 가 나오나요? 아니면 권한/로그인 페이지가 나오나요?
  - 로그인 페이지가 나오면 **액세스 권한이 "모든 사용자" 가 아닙니다**. 1-3 단계를 다시 진행하세요.
- **체크 2**: `experiment.js` 상단 `WEB_APP_URL` 이 placeholder(`YOUR_GOOGLE_APPS_SCRIPT_...`) 그대로인지 확인하세요.
- **체크 3**: 코드를 수정한 뒤에는 **반드시 새 버전으로 재배포**해야 적용됩니다. (배포 → 배포 관리 → 연필 아이콘 → 버전: 새 버전)

### 2) "이 앱은 Google에서 확인하지 않았습니다" 경고

- 본인 계정 권한으로 본인이 만든 스크립트를 사용하는 것이므로 안전합니다. **고급 → 안전하지 않은 페이지로 이동 → 허용**을 선택하세요.

### 3) GitHub Pages URL을 열어도 빈 화면이거나 404

- Repository 가 **Public** 인지 확인
- Settings → Pages 에서 Branch 가 `main`, 폴더가 `/(root)` 인지 확인
- 5분 이상 기다린 뒤 새로고침 (초기 배포는 시간이 걸립니다)
- URL 끝에 `/typeA.html` 또는 `/typeB.html` 을 명시적으로 붙여 다시 시도

### 4) 페이지가 안 넘어가요 / 버튼이 안 눌려요

- 브라우저 콘솔(F12 → Console)에 빨간 에러 메시지가 있는지 확인
- 5개 파일이 모두 같은 폴더에 업로드되었는지 확인 (`stimuli.js` 누락이 가장 흔함)

### 5) 모바일에서도 잘 보이나요?

- 네, 모바일 반응형으로 동작합니다. 폰트/패딩이 화면 크기에 맞춰 조정됩니다.
- 단 모바일 사파리/크롬은 데스크톱 브라우저보다 `beforeunload` 경고가 약하게 동작합니다 (이탈을 100% 막지는 못함).

### 6) 응답을 다 끝냈는데 "전송 실패" 메시지가 나와요

- 응답 데이터는 브라우저 LocalStorage 에 백업되어 있습니다.
- 디브리핑 페이지의 **전송 다시 시도** 버튼을 눌러 재전송하세요.
- 그래도 실패하면 참가자에게 양해를 구하고 F12 → Application → LocalStorage 에서 `experiment_backup_{ID}` 값을 복사 받아 별도 수집해 주세요.

### 7) 로컬에서 미리 보고 싶어요

- `typeA.html` 또는 `typeB.html` 을 더블클릭하면 브라우저에서 바로 열립니다 (페이지 흐름은 동작).
- 단, `file://` 환경에서는 Google Sheets 전송이 실패합니다(보안상 막힘). 디브리핑 페이지에서 전송 실패 표시가 나는 것은 정상이며, 실제 GitHub Pages 환경에서는 정상 전송됩니다.
- 디버그 모드를 켜고 싶으면 `experiment.js` 의 `DEBUG: false` 를 `true` 로 변경하세요. 화면 상단에 배정 결과와 자극 순서가 표시되고 콘솔에 시간 로그가 출력됩니다.

### 8) 타이핑이 너무 느려요 / 너무 빨라요

- `experiment.js` 상단 `CONFIG.TYPING_SPEED_MS_PER_CHAR` 값을 조정하세요.
  - 기본값 `18` → 약간 빠른 ChatGPT 느낌
  - `10` → 매우 빠름
  - `30` → 천천히 흘러나오는 느낌
- 청크 간 자동 진행(Type A)에서의 간격은 `TYPE_A_CHUNK_GAP_MS` (기본 350ms) 로 조정 가능합니다.

---

## 부록. 설정 값 변경

`experiment.js` 상단 `CONFIG` 객체에서 실험 변수를 조정할 수 있습니다.

```js
const CONFIG = {
  WEB_APP_URL: '...',
  MIN_RESPONSE_TIME_MS: 3000,         // 응답 버튼 활성화까지 최소 시간
  MIN_CHUNK_TIME_MS: 1500,            // Type B 청크당 최소 노출 시간
  TYPING_SPEED_MS_PER_CHAR: 18,       // LLM 타이핑 속도
  TYPING_PUNCTUATION_PAUSE_MS: 80,    // 구두점 뒤 추가 멈춤
  TYPE_A_CHUNK_GAP_MS: 350,           // Type A 청크 간 간격
  DEBUG: false
};
```

추가 자극을 넣거나 텍스트를 수정하려면 `stimuli.js` 의 `STIMULI` 배열을 편집하세요. 자극을 6개 외의 개수로 변경하면 `google-apps-script.gs` 의 `HEADERS` 도 함께 수정해야 합니다.

조건 강제 배정 로직은 `typeA.html` / `typeB.html` 상단의 `window.FORCED_CONDITION` 설정으로 동작합니다. 이 값이 없으면 `experiment.js` 가 50:50 무작위 배정으로 fallback 합니다.
