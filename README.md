# 청약우체부 📮

성남·용인·위례·하남·광주(경기) 지역의 **분양·임대 청약 공고**를 하루 5번 자동으로 확인해서, 새 소식을 **텔레그램으로 배달**해주는 서비스예요. 중복 알림은 보내지 않습니다.

- **데이터 출처 (둘 다)**
  - **청약홈**(한국부동산원): 민영·공공 APT 분양 / 무순위·잔여세대 / 공공지원 민간임대
  - **LH**(한국토지주택공사): LH 분양주택 / 임대주택 / 신혼희망타운
- **알림 시점**: 📢 모집공고 게시 / ✅ 청약접수 시작 / ⏰ 접수 마감 임박
- **실행**: GitHub Actions cron (서버 불필요, 무료)
- **대시보드**: 분양/임대/무순위로 필터되는 웹 페이지 (GitHub Pages, 모바일 반응형)
- **자격 요약**: 유형별 소득·자산·**1인 가구 가능 여부**를 알림·대시보드에 함께 표시 (참고용)

> ⚠️ **LH 알림 특성**: LH 목록 API는 접수 날짜 대신 *공고상태(공고중/접수중/접수마감)* 만 줘요. 그래서 LH 건은 **공고 게시·접수 시작**은 알리지만 **"마감 임박"은 청약홈 분양에만** 적용됩니다. 자격(소득 등)은 거르지 않고 일단 다 보내드려요 — 공고문 보고 직접 판단하세요.

---

## 배포 순서

### 0. 값들 먼저 확보

1. **공공데이터 인증키 (1개로 둘 다 사용)** — https://www.data.go.kr 로그인 후, 아래 **두 데이터 모두 "활용신청"** (각각 자동승인):
   - [청약홈 분양정보 조회 서비스 (15098547)](https://www.data.go.kr/data/15098547/openapi.do)
   - [LH 분양임대공고문 조회 서비스 (15058530)](https://www.data.go.kr/data/15058530/openapi.do)

   그다음 마이페이지에서 **일반 인증키(Decoding)** 복사 (⚠️ Encoding 아님). 같은 키가 두 API에 모두 적용돼요.
2. **텔레그램 봇 토큰** — `@BotFather` → `/newbot` (봇 `cheongyak_post_bot` 이미 생성됨)
3. **chat_id** — 받을 곳에 따라:
   - **나 개인**: 봇에게 아무 말이나 보낸 뒤 `https://api.telegram.org/bot<토큰>/getUpdates` → `"chat":{"id": ...}`
   - **그룹/채널로 받기 (추천)**: 그룹(또는 채널) 만들고 **봇을 멤버/관리자로 추가** → 그 방에 메시지 한 번 보낸 뒤 같은 `getUpdates`로 확인. 채널 id는 보통 `-100…`으로 시작해요.

### 1. GitHub에 올리기

저장소 이름 **`cheongyak_post`** (Private 권장):

```bash
cd cheongyak_post
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin <저장소 git URL>
git push -u origin main
```

(터미널이 부담되면 **GitHub Desktop**으로 폴더 추가 → Publish.)

### 2. 시크릿 3개 등록

**Settings → Secrets and variables → Actions → New repository secret**:

| 이름 | 값 |
|------|-----|
| `DATA_GO_KR_KEY` | 0-1 Decoding 인증키 |
| `TELEGRAM_BOT_TOKEN` | 0-2 봇 토큰 |
| `TELEGRAM_CHAT_ID` | 0-3 chat_id (개인/그룹/채널) |

### 3. 첫 실행은 "시드 모드"로 (중요)

기존 공고 폭탄을 막기 위해 첫 회는 **알림 없이 현재 목록만 기록**합니다.

- **Actions 탭 → "청약우체부" → Run workflow → seed 체크 → 실행**
- 이후 cron이 자동으로 돌며, **이때 이후의 새 공고만** 배달됩니다.

### 4. 대시보드 켜기 (선택, 무료)

1. **Settings → Pages → Source: Deploy from a branch → main / `/docs` → Save**
2. `https://<내아이디>.github.io/cheongyak_post/` 에서 열림 (cron/시드 1회 후 데이터 채워짐)

기능:

- **유형 필터**(분양/임대/무순위) + **내 조건 필터**(`#1인가구` `#예비신혼부부` `#청년` `#생애최초` 등 다중 선택) — 공고마다 해시태그가 붙어 내 상황에 맞는 것만 골라봄
- 상태 배지, 마감임박 우선 정렬, 마감 흐리게, 출처(청약홈·LH) 표시, 모바일 반응형
- **공고별 메모** — AI로 요약한 소득·자산 등을 카드에 적어두면 저장됨. **"🤖 AI 요약 프롬프트 복사"** 버튼으로 공고 보러 갈 때 쓸 프롬프트를 바로 복사
  - ⚠️ 메모는 **그 브라우저(기기)에만** 저장됩니다(백엔드 없음). 폰↔PC 동기화는 안 돼요.

내 조건 태그 목록은 `src/eligibility.js`의 `PERSONAS`에서 추가/삭제할 수 있어요.

### 5. 끝 — 이후 자동

하루 5번(KST 08·11·14·17·20시) 자동 실행. PC 꺼져 있어도 됩니다.

---

## 동작 방식

```
청약홈 API (날짜기반) ┐
                      ├→ 합치기 → 지역 필터 ─┬→ 트리거 → 중복 제외 → 텔레그램 배달 → 상태 저장
LH API (상태기반)     ┘                      └→ 상태 계산 → docs/data/listings.json (대시보드)
```

- 청약홈: 날짜로 공고게시/접수시작/마감임박 판정
- LH: 공고상태로 공고게시/접수시작 판정 (마감임박 없음)
- 중복 방지: `(출처+공고+트리거)` 단위로 `state/notified.json`에 기록

## 자격(소득·자산) 요약 — `src/eligibility.js`

유형별(행복주택·국민임대·통합공공임대·신혼희망타운·공공분양·민영분양 등) 일반 자격 기준과 **1인 가구 가능 여부**를 한 파일에 모아두고, 공고에 매칭해서 알림·대시보드에 같이 보여줘요.

- ⚠️ **참고용**입니다. 소득·자산 기준값은 **해마다 바뀌므로**(현재 `BASE_YEAR = 2025`), 매년 한 번 `src/eligibility.js`만 업데이트하세요. 카드/메시지마다 "공고문 확인 필수" 문구가 붙습니다.
- 더 정확하게 가려면 공고문 PDF를 AI로 요약하는 방식(별도 비용)으로 업그레이드할 수 있어요.

## 설정값은 전부 `config.js` 한 곳에

- `region.includeKeywords` — 알림 받을 지역 키워드
- `applyhome.endpoints` / `lh.types` — 수집할 유형 (group: 분양/임대/무순위)
- `lh.regionCode` — LH 지역코드 (경기 = 41)
- `triggers.closingSoonDays` / `lookbackDays` / `lhLookbackDays`
- cron 시각은 `.github/workflows/notify.yml`

## 로컬 테스트

```bash
npm run test:mock   # 필터/트리거/상태 로직 검증 (네트워크 호출 없음)
# 실제 1회 실행:
DATA_GO_KR_KEY=... TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... npm start
```

## ⚠️ 첫 실행 로그 확인

`[warn] 청약홈 무순위/잔여 … 404` 또는 `[warn] LH …` 가 뜨면 해당 소스의 엔드포인트/유형 코드만 점검하면 됩니다. 청약홈 APT(`getAPTLttotPblancDetail`)와 LH(`lhLeaseNoticeInfo1`)는 확인된 값이에요. 막히면 로그를 그대로 공유해주세요.
