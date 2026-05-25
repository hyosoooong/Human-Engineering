/* =========================================================================
 * experiment.js
 * SPA 방식 실험 컨트롤러
 *
 * 페이지 흐름:
 *   page-welcome → page-demographics → page-nfc → page-instructions
 *   → page-stimulus (8회 반복) → page-tlx → page-interview → page-debrief
 *
 * 조건 배정:
 *   typeA.html / typeB.html 이 <script>window.FORCED_CONDITION='A'|'B'</script>
 *   를 미리 설정하여 진입. 값이 없으면 50:50 무작위 배정으로 fallback.
 *
 * 자극 렌더링:
 *   LLM 챗봇 UI 형태로 청크를 한 글자씩 타이핑하며 표시.
 *   - Type A: 모든 청크를 순차적으로 자동 타이핑 → 끝나면 응답 가능
 *   - Type B: 청크 1개 타이핑 → "다음 단계 보기" → 다음 청크 타이핑
 *
 * 데이터 전송:
 *   디브리핑 단계에서 Google Apps Script 웹앱으로 POST.
 *   LocalStorage 백업 + 실패 시 재시도 버튼 제공.
 * ========================================================================= */

/* =========================================================
 * 1. 사용자 설정 (배포 시 수정)
 * ========================================================= */
const CONFIG = {
  // [필수 수정] Google Apps Script 웹앱 URL
  // README.md "웹 앱 배포" 단계에서 발급받은 URL을 붙여넣으세요.
  // 형태: https://script.google.com/macros/s/AKfycb.../exec
  WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxTwItGpjK4UDOsJO1MnCWJJYcCHAcgMU7Bwm9N4JgGCeXXSz9WxBWE7SL2AqNygcas/exec',

  // 자극 응답 버튼이 활성화되기까지의 최소 시간(ms)
  // - Type A: 모든 청크 타이핑 완료 후부터 카운트
  // - Type B: 마지막 청크 타이핑 완료 후부터 카운트
  MIN_RESPONSE_TIME_MS: 1000,

  // Type B 마지막 청크 타이핑 완료 후 응답 버튼 활성화까지의 최소 시간(ms)
  MIN_CHUNK_TIME_MS: 1000,

  // Type B 중간 청크 타이핑 완료 후 "다음 단계 보기" 버튼 활성화까지의 최소 시간(ms)
  MIN_NEXT_CHUNK_TIME_MS: 500,

  // LLM 타이핑 효과: 글자당 노출 간격(ms). 작을수록 빠름.
  TYPING_SPEED_MS_PER_CHAR: 18,

  // 구두점(., ,, ?, !, 등) 뒤 추가 멈춤(ms). 자연스러움 향상
  TYPING_PUNCTUATION_PAUSE_MS: 80,

  // Type A 에서 청크 간 자동 진행 간격(ms)
  TYPE_A_CHUNK_GAP_MS: 350,

  // 디버그 모드: 콘솔 로그 + 화면 상단에 배정 정보 표시
  DEBUG: false
};

/* =========================================================
 * 2. 전역 상태
 * ========================================================= */
const state = {
  participantId: null,
  condition: null,            // 'A' or 'B'
  stimulusOrder: [],          // STIMULI 배열을 셔플한 결과(객체 배열)
  currentStimulusIdx: 0,
  currentChunkIdx: 0,         // Type B: 현재 노출 중인 청크 인덱스
  experimentStartTime: null,
  currentStimulusStartTime: null,
  chunkStartTimes: [],        // Type B 청크별 타이핑 시작 시각(performance.now)
  chunkDurations: [],         // Type B 청크별 소요 시간(ms)
  responses: {},              // { S1: {response, total_time_ms, chunk_times}, ... }
  data: {
    demographics: {},
    nfc: {},
    tlx: {},
    interview: {}
  },
  experimentCompleted: false
};

/* =========================================================
 * 3. 유틸리티
 * ========================================================= */
function $(id) {
  return document.getElementById(id);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debugLog(...args) {
  if (CONFIG.DEBUG) console.log('[EXP]', ...args);
}

// Fisher-Yates 셔플
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 참가자 ID: 타임스탬프 + 랜덤 6자리
function generateParticipantId() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `P${ts}${rand}`;
}

// 조건 결정: URL/HTML에서 FORCED_CONDITION 이 설정되었으면 사용, 아니면 50:50 무작위
function decideCondition() {
  if (typeof window.FORCED_CONDITION === 'string' &&
      (window.FORCED_CONDITION === 'A' || window.FORCED_CONDITION === 'B')) {
    return window.FORCED_CONDITION;
  }
  return Math.random() < 0.5 ? 'A' : 'B';
}

/* =========================================================
 * 4. 페이지 전환 + 진행률
 * ========================================================= */
const TOTAL_STEPS = 15; // 사전 4 + 자극 8 + 사후 3

function getStepIndex(pageId) {
  if (pageId === 'page-welcome') return 0;
  if (pageId === 'page-demographics') return 1;
  if (pageId === 'page-nfc') return 2;
  if (pageId === 'page-instructions') return 3;
  if (pageId === 'page-stimulus') return 4 + state.currentStimulusIdx;
  if (pageId === 'page-tlx') return 12;
  if (pageId === 'page-interview') return 13;
  if (pageId === 'page-debrief') return 14;
  return 0;
}

function updateProgress(pageId) {
  const step = getStepIndex(pageId);
  const pct = Math.round(((step + 1) / TOTAL_STEPS) * 100);
  const fill = $('progressFill');
  const label = $('progressLabel');
  if (fill) fill.style.width = pct + '%';
  if (label) label.textContent = `진행 ${step + 1} / ${TOTAL_STEPS} 단계`;
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const target = $(pageId);
  if (target) target.classList.add('active');
  updateProgress(pageId);
  window.scrollTo({ top: 0, behavior: 'instant' });
  debugLog('show', pageId);
}

/* =========================================================
 * 5. 초기화
 * ========================================================= */
function init() {
  // 새로고침/이탈 방지
  window.addEventListener('beforeunload', (e) => {
    if (state.experimentStartTime && !state.experimentCompleted) {
      e.preventDefault();
      e.returnValue = '실험이 진행 중입니다. 페이지를 떠나면 응답이 사라집니다.';
      return e.returnValue;
    }
  });

  // 참가자/조건 배정
  state.participantId = generateParticipantId();
  state.condition = decideCondition();
  state.stimulusOrder = shuffle(getStimuliForCondition(state.condition));
  state.experimentStartTime = Date.now();

  debugLog('participant', state.participantId);
  debugLog('condition', state.condition,
    typeof window.FORCED_CONDITION === 'string' ? '(forced)' : '(random)');
  debugLog('order', state.stimulusOrder.map(s => s.id).join(','));

  if (CONFIG.DEBUG) {
    const panel = $('debugPanel');
    panel.style.display = 'block';
    panel.textContent =
      `참가자 ID: ${state.participantId}\n` +
      `조건: Type ${state.condition} ` +
        (typeof window.FORCED_CONDITION === 'string' ? '(URL 강제)' : '(랜덤)') + '\n' +
      `자극 순서: ${state.stimulusOrder.map(s => s.id).join(' → ')}\n` +
      `MIN_RESPONSE_TIME_MS=${CONFIG.MIN_RESPONSE_TIME_MS}, ` +
      `MIN_CHUNK_TIME_MS=${CONFIG.MIN_CHUNK_TIME_MS}, ` +
      `TYPING_SPEED_MS_PER_CHAR=${CONFIG.TYPING_SPEED_MS_PER_CHAR}`;
  }

  bindEvents();
  showPage('page-welcome');
}

/* =========================================================
 * 6. 이벤트 바인딩
 * ========================================================= */
function bindEvents() {
  // 동의서
  $('consentCheck').addEventListener('change', (e) => {
    $('startBtn').disabled = !e.target.checked;
  });
  $('startBtn').addEventListener('click', () => showPage('page-demographics'));

  // 인구통계 / NFC / 안내
  $('demographicsNextBtn').addEventListener('click', handleDemographicsSubmit);
  $('nfcNextBtn').addEventListener('click', handleNfcSubmit);
  $('instructionsNextBtn').addEventListener('click', () => {
    state.currentStimulusIdx = 0;
    showPage('page-stimulus');
    renderStimulus();
  });

  // 자극 응답
  $('responseYesBtn').addEventListener('click', () => handleResponse('yes'));
  $('responseNoBtn').addEventListener('click', () => handleResponse('no'));
  $('nextChunkBtn').addEventListener('click', handleNextChunk);

  // 사후
  $('tlxNextBtn').addEventListener('click', handleTlxSubmit);
  $('interviewSubmitBtn').addEventListener('click', handleInterviewSubmit);

  // 사후 1·2번 '기타' 선택 시 직접 입력란 표시/숨김
  [['interview1', 'interview1Other'], ['interview2', 'interview2Other']].forEach(([name, otherId]) => {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      el.addEventListener('change', () => {
        const otherInput = $(otherId);
        const isOther = el.value === '기타' && el.checked;
        otherInput.style.display = isOther ? 'block' : 'none';
        if (isOther) otherInput.focus();
      });
    });
  });

  // 재전송
  $('retryBtn').addEventListener('click', () => {
    $('retryBtn').disabled = true;
    submitAllData();
  });
}

/* =========================================================
 * 7. 페이지별 핸들러 (사전 단계)
 * ========================================================= */
function handleDemographicsSubmit() {
  const ageEl = $('ageInput');
  const errEl = $('demographicsError');
  errEl.textContent = '';

  const age = parseInt(ageEl.value, 10);
  if (isNaN(age) || age < 1 || age > 120) {
    errEl.textContent = '연령을 올바르게 입력해 주세요.';
    return;
  }
  if (age < 18) {
    errEl.textContent = '본 연구는 만 18세 이상만 참여하실 수 있습니다.';
    return;
  }

  const aiUsageEl = document.querySelector('input[name="aiUsage"]:checked');
  if (!aiUsageEl) {
    errEl.textContent = 'AI 사용 빈도를 선택해 주세요.';
    return;
  }

  state.data.demographics.age = age;
  state.data.demographics.aiUsage = parseInt(aiUsageEl.value, 10);
  showPage('page-nfc');
}

function handleNfcSubmit() {
  const errEl = $('nfcError');
  errEl.textContent = '';

  const nfc = {};
  for (let i = 1; i <= 15; i++) {
    const el = document.querySelector(`input[name="nfc${i}"]:checked`);
    if (!el) {
      errEl.textContent = '모든 문항에 응답해 주세요.';
      return;
    }
    nfc[i] = parseInt(el.value, 10);
  }
  state.data.nfc = nfc;
  showPage('page-instructions');
}

/* =========================================================
 * 8. 자극 렌더링 (챗봇 UI + 타이핑)
 * ========================================================= */
function renderStimulus() {
  const stim = state.stimulusOrder[state.currentStimulusIdx];

  // 자극 진행 표시
  $('stimProgress').textContent =
    `${state.currentStimulusIdx + 1} / ${state.stimulusOrder.length}번째 텍스트`;

  // 시나리오
  $('scenarioText').textContent = stim.scenario;

  // 챗봇 영역 초기화
  $('chunksContainer').innerHTML = '';
  hideTypingIndicator();

  // 응답 영역 초기화
  $('responseGroup').style.display = 'none';
  $('responseYesBtn').disabled = true;
  $('responseNoBtn').disabled = true;
  $('nextChunkBtn').style.display = 'none';
  $('nextChunkBtn').disabled = true;

  state.currentStimulusStartTime = performance.now();
  state.chunkStartTimes = [];
  state.chunkDurations = [];
  state.currentChunkIdx = 0;

  if (state.condition === 'A') {
    renderTypeA(stim);
  } else {
    renderTypeB_chunk(stim, 0);
  }
}

// Type A: 모든 청크 순차 자동 타이핑 → 응답 가능
async function renderTypeA(stim) {
  showTypingIndicator();
  for (let i = 0; i < stim.chunks.length; i++) {
    await appendChunkWithTyping(stim.chunks[i], /*applyFade=*/false);
    if (i < stim.chunks.length - 1) {
      await sleep(CONFIG.TYPE_A_CHUNK_GAP_MS);
    }
  }
  hideTypingIndicator();

  $('responseGroup').style.display = 'block';
  $('responseYesBtn').disabled = true;
  $('responseNoBtn').disabled = true;
  setTimeout(() => {
    $('responseYesBtn').disabled = false;
    $('responseNoBtn').disabled = false;
  }, CONFIG.MIN_RESPONSE_TIME_MS);

  debugLog(`Type A 자극 ${stim.id} 타이핑 완료, ${CONFIG.MIN_RESPONSE_TIME_MS}ms 후 응답 가능`);
}

// Type B: 청크 1개 타이핑 → 버튼 노출
async function renderTypeB_chunk(stim, chunkIdx) {
  state.chunkStartTimes[chunkIdx] = performance.now();

  // 타이핑 중 모든 버튼 비활성화
  $('nextChunkBtn').disabled = true;
  $('responseYesBtn').disabled = true;
  $('responseNoBtn').disabled = true;

  showTypingIndicator();
  await appendChunkWithTyping(stim.chunks[chunkIdx], /*applyFade=*/true);
  hideTypingIndicator();

  const isLast = (chunkIdx === stim.chunks.length - 1);
  if (isLast) {
    $('nextChunkBtn').style.display = 'none';
    $('responseGroup').style.display = 'block';
    setTimeout(() => {
      $('responseYesBtn').disabled = false;
      $('responseNoBtn').disabled = false;
    }, CONFIG.MIN_CHUNK_TIME_MS);
  } else {
    $('nextChunkBtn').style.display = 'inline-block';
    setTimeout(() => {
      $('nextChunkBtn').disabled = false;
    }, CONFIG.MIN_NEXT_CHUNK_TIME_MS);
  }

  debugLog(`Type B 자극 ${stim.id} 청크 ${chunkIdx} 타이핑 완료`);
}

// 청크 DOM 생성 + 페이드인 + 타이핑
async function appendChunkWithTyping(chunk, applyFade) {
  const container = $('chunksContainer');

  // 소제목(태그) 없이 줄글 형태로 표시.
  // - Type A: 청크를 인라인으로 이어붙여 하나의 문단처럼 연속 표시
  // - Type B: 단계별 노출이 잘 드러나도록 청크마다 줄바꿈(블록)하여 표시
  const isFirst = container.childElementCount === 0;
  const isStepwise = (state.condition === 'B');

  const wrap = document.createElement(isStepwise ? 'div' : 'span');
  wrap.className = 'ai-chunk'
    + (isStepwise ? ' ai-chunk-block' : '')
    + (applyFade && chunk.isError ? ' chunk-faded' : '');
  wrap.style.opacity = '0';

  const textEl = document.createElement('span');
  textEl.className = 'ai-chunk-text';

  // Type A(연속 줄글)에서 첫 청크가 아니면 앞선 문장과의 간격을 위해 공백을 둠
  if (!isFirst && !isStepwise) {
    textEl.appendChild(document.createTextNode(' '));
  }

  wrap.appendChild(textEl);
  container.appendChild(wrap);

  // 페이드인 트리거
  requestAnimationFrame(() => {
    wrap.style.opacity = '';
  });

  // 자동 스크롤 (마지막 청크가 보이도록)
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 페이드인이 시작될 짧은 여유 후 타이핑
  await sleep(120);
  await typeText(textEl, chunk.text, CONFIG.TYPING_SPEED_MS_PER_CHAR);
}

// 한 글자씩 노출 + 깜빡이는 커서 + 구두점 후 짧은 멈춤
function typeText(element, text, speedMs) {
  return new Promise(resolve => {
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    element.appendChild(cursor);

    function step() {
      if (i >= text.length) {
        cursor.remove();
        resolve();
        return;
      }
      const ch = text[i];
      const textNode = document.createTextNode(ch);
      element.insertBefore(textNode, cursor);
      i++;

      // 마지막 글자가 구두점이면 잠시 멈춤
      const isPunct = (ch === '.' || ch === ',' || ch === '?' ||
                       ch === '!' || ch === ';' || ch === ':');
      const delay = isPunct ? speedMs + CONFIG.TYPING_PUNCTUATION_PAUSE_MS : speedMs;
      setTimeout(step, delay);
    }
    step();
  });
}

function showTypingIndicator() {
  $('typingIndicator').classList.add('active');
}
function hideTypingIndicator() {
  $('typingIndicator').classList.remove('active');
}

/* =========================================================
 * 9. 사용자 액션 핸들러
 * ========================================================= */
function handleNextChunk() {
  const stim = state.stimulusOrder[state.currentStimulusIdx];
  const justFinishedIdx = state.currentChunkIdx;

  // 직전 청크 체류 시간 기록
  state.chunkDurations[justFinishedIdx] =
    performance.now() - state.chunkStartTimes[justFinishedIdx];

  state.currentChunkIdx++;
  if (state.currentChunkIdx < stim.chunks.length) {
    renderTypeB_chunk(stim, state.currentChunkIdx);
  }
}

function handleResponse(choice) {
  const stim = state.stimulusOrder[state.currentStimulusIdx];
  const now = performance.now();
  const totalTime = now - state.currentStimulusStartTime;

  let chunkTimesStr = '';
  if (state.condition === 'B') {
    const lastIdx = stim.chunks.length - 1;
    state.chunkDurations[lastIdx] = now - state.chunkStartTimes[lastIdx];
    chunkTimesStr = state.chunkDurations.map(t => Math.round(t)).join('|');
  }

  state.responses[stim.id] = {
    response: choice,
    total_time_ms: Math.round(totalTime),
    chunk_times: chunkTimesStr
  };
  debugLog(`자극 ${stim.id} 응답: ${choice}, total=${Math.round(totalTime)}ms, chunks=${chunkTimesStr}`);

  state.currentStimulusIdx++;
  if (state.currentStimulusIdx < state.stimulusOrder.length) {
    renderStimulus();
    updateProgress('page-stimulus');
  } else {
    showPage('page-tlx');
  }
}

/* =========================================================
 * 10. TLX / 인터뷰 / 전송
 * ========================================================= */
function handleTlxSubmit() {
  const errEl = $('tlxError');
  errEl.textContent = '';
  const tlx = {};
  const keys = ['mental', 'effort', 'frustration'];
  for (const k of keys) {
    const el = document.querySelector(`input[name="tlx_${k}"]:checked`);
    if (!el) {
      errEl.textContent = '모든 항목에 응답해 주세요.';
      return;
    }
    tlx[k] = parseInt(el.value, 10);
  }
  state.data.tlx = tlx;
  showPage('page-interview');
}

// 객관식(라디오) 응답을 읽되 '기타' 선택 시 직접 입력값을 사용.
// 미응답/기타 미입력이면 오류 메시지를 띄우고 null 반환.
function readRadioWithOther(name, otherId, labelText) {
  const errEl = $('interviewError');
  const el = document.querySelector(`input[name="${name}"]:checked`);
  if (!el) {
    if (errEl) errEl.textContent = `${labelText} 문항을 선택해 주세요.`;
    return null;
  }
  if (el.value === '기타') {
    const otherText = $(otherId).value.trim();
    if (!otherText) {
      if (errEl) errEl.textContent = `'기타'를 선택하신 경우 ${labelText} 내용을 입력해 주세요.`;
      return null;
    }
    return '기타: ' + otherText;
  }
  return el.value;
}

function handleInterviewSubmit() {
  const errEl = $('interviewError');
  if (errEl) errEl.textContent = '';

  // 1·2번: 객관식(라디오, 필수). 3번: 자유응답(선택).
  const q1Value = readRadioWithOther('interview1', 'interview1Other', '1번');
  if (q1Value === null) return;
  const q2Value = readRadioWithOther('interview2', 'interview2Other', '2번');
  if (q2Value === null) return;

  state.data.interview = {
    q1: q1Value,
    q2: q2Value,
    q3: $('interview3').value.trim()
  };
  state.experimentCompleted = true;
  showPage('page-debrief');
  submitAllData();
}

function formatKstTimestamp(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ` +
         `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}`;
}

function buildPayload() {
  const totalDuration = Date.now() - state.experimentStartTime;
  const payload = {
    timestamp: formatKstTimestamp(new Date()),
    participant_id: state.participantId,
    ui_condition: state.condition,
    age: state.data.demographics.age,
    ai_usage_frequency: state.data.demographics.aiUsage,
    nfc_1: state.data.nfc[1],
    nfc_2: state.data.nfc[2],
    nfc_3: state.data.nfc[3],
    nfc_4: state.data.nfc[4],
    nfc_5: state.data.nfc[5],
    nfc_6: state.data.nfc[6],
    nfc_7: state.data.nfc[7],
    nfc_8: state.data.nfc[8],
    nfc_9: state.data.nfc[9],
    nfc_10: state.data.nfc[10],
    nfc_11: state.data.nfc[11],
    nfc_12: state.data.nfc[12],
    nfc_13: state.data.nfc[13],
    nfc_14: state.data.nfc[14],
    nfc_15: state.data.nfc[15],
    stimulus_order: state.stimulusOrder.map(s => s.id).join(','),
    tlx_mental_demand: state.data.tlx.mental,
    tlx_effort: state.data.tlx.effort,
    tlx_frustration: state.data.tlx.frustration,
    interview_1: state.data.interview.q1,
    interview_2: state.data.interview.q2,
    interview_3: state.data.interview.q3,
    total_duration_ms: totalDuration
  };
  ['S1', 'S2', 'S3', 'S4', 'N1', 'N2', 'N3', 'N4'].forEach(id => {
    const r = state.responses[id] || {};
    payload[`${id}_response`] = r.response || '';
    payload[`${id}_total_time_ms`] = r.total_time_ms != null ? r.total_time_ms : '';
    payload[`${id}_chunk_times`] = r.chunk_times || '';
  });
  return payload;
}

function submitAllData() {
  const payload = buildPayload();
  const key = `experiment_backup_${state.participantId}`;

  // 1) LocalStorage 백업
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    debugLog('LocalStorage 백업 실패', e);
  }

  if (CONFIG.DEBUG) console.log('전송 payload', payload);

  const statusEl = $('debriefStatus');
  statusEl.classList.remove('error');
  statusEl.textContent = '응답을 전송하고 있습니다…';

  const isPlaceholder = CONFIG.WEB_APP_URL.indexOf('YOUR_GOOGLE_APPS_SCRIPT') === 0 ||
                        CONFIG.WEB_APP_URL.indexOf('http') !== 0;

  if (isPlaceholder) {
    statusEl.classList.add('error');
    statusEl.textContent =
      '⚠️ 전송 URL이 설정되지 않았습니다. (관리자에게 문의해 주세요)\n' +
      '응답은 브라우저에 임시 저장되었습니다.';
    $('retryBtn').style.display = 'none';
    return;
  }

  // 2) no-cors POST (응답 상태 확인 불가 → 백업은 일정 시간 후 제거)
  fetch(CONFIG.WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).then(() => {
    statusEl.classList.remove('error');
    statusEl.textContent = '✅ 응답이 정상적으로 전송되었습니다. 감사합니다!';
    setTimeout(() => {
      try { localStorage.removeItem(key); } catch (e) {}
    }, 2000);
    $('retryBtn').style.display = 'none';
  }).catch((err) => {
    debugLog('전송 실패', err);
    statusEl.classList.add('error');
    statusEl.textContent =
      '⚠️ 네트워크 오류로 전송이 실패했습니다.\n' +
      '응답은 브라우저에 임시 저장되었습니다. 아래 버튼으로 다시 시도해 주세요.';
    $('retryBtn').style.display = 'inline-block';
    $('retryBtn').disabled = false;
  });
}

/* =========================================================
 * 11. 부팅
 * ========================================================= */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
