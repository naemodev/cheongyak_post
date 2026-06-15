# 청약 알림 (성남 주변)

성남·용인·위례·하남·광주(경기) 지역의 **청약 분양정보**를 하루 5번 자동으로 확인해서, 새로운 소식이 있으면 **텔레그램으로 알려주는** 서비스예요. 중복 알림은 보내지 않습니다.

- **데이터 출처**: 한국부동산원 청약홈 분양정보 API (공공데이터포털, 무료)
- **알림 시점**: 📢 모집공고 게시 / ✅ 청약접수 시작 / ⏰ 접수 마감 임박(종료 1일 전)
- **대상 유형**: 민영·공공 APT / 무순위·잔여세대 / 공공지원 민간임대
- **실행**: GitHub Actions cron (서버 불필요, 무료)
- **대시보드**: 받은 청약을 한눈에 보는 웹 페이지 (GitHub Pages, 모바일 반응형)

---

## 설정 (한 번만 하면 됨)

### 1. 공공데이터 인증키 발급

1. https://www.data.go.kr/data/15098547/openapi.do 접속 → 회원가입/로그인
2. **활용신청** 버튼 클릭 → 자동승인 (개발계정)
3. 마이페이지 → 오픈API → **일반 인증키(Decoding)** 값 복사
   - ⚠️ Encoding이 아니라 **Decoding** 키를 사용하세요.

### 2. 텔레그램 봇 만들기

1. 텔레그램에서 **@BotFather** 검색 → `/newbot` → 이름 정하면 **봇 토큰**을 줍니다 (`123456:ABC...` 형태).
2. 방금 만든 내 봇을 검색해서 아무 메시지나 한 번 보냅니다 (예: `hi`).
3. **chat_id 확인**: 브라우저에서 아래 주소를 열고 (`<토큰>` 자리에 봇 토큰 입력)
   ```
   https://api.telegram.org/bot<토큰>/getUpdates
   ```
   응답 JSON의 `"chat":{"id": ...}` 숫자가 **chat_id**입니다.

### 3. GitHub에 올리고 시크릿 등록

1. 이 `cheongyak-alert` 폴더를 새 GitHub 저장소(private 권장)에 push.
2. 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에서 3개 등록:

   | 이름 | 값 |
   |------|-----|
   | `DATA_GO_KR_KEY` | 1번에서 받은 Decoding 인증키 |
   | `TELEGRAM_BOT_TOKEN` | 2번 봇 토큰 |
   | `TELEGRAM_CHAT_ID` | 2번 chat_id |

### 4. 첫 실행은 "시드 모드"로 (중요)

처음 실행하면 기존 공고가 한꺼번에 쏟아질 수 있어요. 그래서 첫 회는 **알림 없이 현재 목록만 기록**하고 넘어갑니다.

- 저장소 **Actions 탭 → "청약 알림" → Run workflow → seed 체크 → 실행**.
- 이후부터는 cron이 자동으로 돌며, **이때 이후의 새 공고만** 알림이 옵니다.

끝! 별도 서버나 PC를 켜둘 필요 없습니다.

---

### 5. 대시보드 켜기 (선택, 무료)

텔레그램 알림과 별개로, 받은 청약을 한눈에 보는 웹 페이지가 있어요. 알림과 **같은 데이터 소스**(매 실행마다 `docs/data/listings.json`에 저장)를 읽습니다.

1. 저장소 **Settings → Pages → Source: "Deploy from a branch"** → Branch: `main`, 폴더: `/docs` → Save.
2. 잠시 뒤 `https://<내아이디>.github.io/<저장소이름>/` 에서 열립니다.
3. 데이터는 cron이 한 번 돈 뒤부터 채워져요. (시드 실행만 해도 목록은 채워짐)

대시보드 기능: 상태 배지(마감임박/접수중/예정/마감), 마감임박 우선 정렬, 유형 필터, 마감 항목은 흐리게 표시, 모바일 반응형.

---

## 동작 방식

```
fetch (청약홈 API) → 지역 필터 ─┬→ 트리거 판정 → 중복 제외 → 텔레그램 발송 → 상태 저장
                                └→ 상태 계산 → docs/data/listings.json (대시보드)
```

- 실행 시각: 매일 KST 08, 11, 14, 17, 20시 (`.github/workflows/notify.yml`의 cron)
- 중복 방지: `(공고 + 트리거 종류)` 단위로 `state/notified.json`에 기록 → 같은 알림 재발송 안 함
- 한 공고가 "공고 게시 → 접수 시작 → 마감 임박" 단계별로 각각 한 번씩 알림

## 직접 바꿀 수 있는 값 — 전부 `config.js` 한 곳에

모든 설정은 `config.js`에 모여 있어요. 코드를 뒤질 필요 없습니다.

- `region.includeKeywords` — 알림 받을 지역 키워드 (지역 추가/제거)
- `triggers.closingSoonDays` — 마감 며칠 전에 알릴지 (기본 1일)
- `triggers.lookbackDays` — 며칠 이내 공고만 볼지 (기본 30일)
- `endpoints` — 수집할 청약 유형
- cron 시각은 `.github/workflows/notify.yml`에서 조정

## 로컬에서 테스트

```bash
# 트리거/필터 로직 검증 (API·텔레그램 호출 없음)
npm run test:mock

# 실제 1회 실행 (환경변수 필요)
DATA_GO_KR_KEY=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... npm start
```

## ⚠️ 한 가지 확인 필요

무순위/잔여세대·공공지원 민간임대 엔드포인트의 **정확한 operation 이름**은 청약홈 API 버전에 따라 다를 수 있어요. 만약 실행 로그에 `[warn] 무순위/잔여 ... 404`처럼 뜨면, [공공데이터포털 Swagger 문서](https://www.data.go.kr/data/15098547/openapi.do)에서 실제 operation 이름을 확인해 `config.js`의 `endpoints[].op` 값만 바꿔주면 됩니다. (APT는 `getAPTLttotPblancDetail`로 확인됨.)
