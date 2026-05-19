/* =========================================================================
 * stimuli.js
 * 실험에 사용되는 6개 자극 데이터
 *
 * - type: 'signal'(논리 오류 포함) 또는 'noise'(정상)
 * - domain: medical / legal / finance
 * - scenario: 자극 앞에 제시되는 상황 시나리오 문구
 * - chunks: 청크 배열. 각 청크는 { tag, text, isError } 구조
 *     isError=true 는 Type B에서 opacity 0.35 가 적용될 청크를 의미함
 *     (N1 의 [결과] 청크는 학습 차단용으로 isError=true 이지만
 *      자극 자체는 정상(noise)임에 유의)
 * ========================================================================= */
const STIMULI = [
  {
    id: 'S1',
    type: 'signal',
    domain: 'medical',
    scenario: '당신은 최근 자주 두통이 생겨 AI에게 정보를 검색하고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '본 연구는 카페인 섭취가 편두통 완화에 효과적이라는 점을 밝혔다.',
        isError: false
      },
      {
        tag: '방법',
        text: '18세 이상 성인 환자 320명을 대상으로 8주간 임상시험을 진행하였다.',
        isError: false
      },
      {
        tag: '결과',
        text: '카페인 200mg 섭취 집단은 위약 집단 대비 두통 강도가 평균 28% 감소하였다.',
        isError: false
      },
      {
        tag: '결론',
        text: '따라서 청소년 편두통 환자에게도 카페인 섭취를 적극 권장할 수 있다.',
        isError: true
      }
    ]
  },
  {
    id: 'S2',
    type: 'signal',
    domain: 'legal',
    scenario: '당신은 자취방 계약 문제로 AI에게 법률 정보를 묻고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '주택임대차보호법은 임차인이 최대 2회까지 계약 갱신을 요구할 권리를 보장한다.',
        isError: false
      },
      {
        tag: '조건',
        text: '갱신 요구권은 계약 만료 6개월 전부터 2개월 전 사이에 행사해야 효력이 있다.',
        isError: false
      },
      {
        tag: '예외',
        text: '임대인이 직접 거주를 사유로 갱신을 거절할 경우, 갱신 요구는 인정되지 않는다.',
        isError: false
      },
      {
        tag: '결론',
        text: '따라서 임차인은 어떠한 경우에도 한 번의 계약 갱신을 보장받는다.',
        isError: true
      }
    ]
  },
  {
    id: 'S3',
    type: 'signal',
    domain: 'finance',
    scenario: '당신은 첫 월급으로 적금을 들지 펀드를 들지 고민하며 AI에게 조언을 구하고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '본 분석은 20대 사회초년생에게 적합한 세 가지 재테크 방법을 비교하였다.',
        isError: false
      },
      {
        tag: '방법 1',
        text: '첫째, 청년도약계좌는 최대 5년간 정부 매칭 지원을 받을 수 있다.',
        isError: false
      },
      {
        tag: '방법 2-3',
        text: '둘째, 인덱스 펀드 적립식 투자는 장기 분산 효과가 크다. 셋째, ISA 계좌는 비과세 한도가 있다. 넷째, 청년형 소득공제 장기펀드도 검토할 만하다.',
        isError: true
      },
      {
        tag: '결론',
        text: '본인의 위험 선호도에 따라 위 세 가지 중 선택할 것을 권장한다.',
        isError: false
      }
    ]
  },
  {
    id: 'N1',
    type: 'noise',
    domain: 'medical',
    scenario: '당신은 최근 자주 두통이 생겨 AI에게 정보를 검색하고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '본 연구는 규칙적인 유산소 운동이 만성 두통 빈도에 미치는 영향을 분석하였다.',
        isError: false
      },
      {
        tag: '방법',
        text: '18세 이상 성인 두통 환자 250명을 대상으로 12주간 추적 조사를 실시하였다.',
        isError: false
      },
      {
        tag: '결과',
        text: '주 3회 이상 30분 운동 집단은 비운동 집단 대비 두통 빈도가 평균 35% 감소하였다.',
        isError: true
      },
      {
        tag: '결론',
        text: '연구진은 만성 두통 관리에 유산소 운동을 보조 요법으로 권장하였다.',
        isError: false
      }
    ]
  },
  {
    id: 'N2',
    type: 'noise',
    domain: 'legal',
    scenario: '당신은 자취방 계약 문제로 AI에게 법률 정보를 묻고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '주택임대차보호법은 보증금 반환을 보호하기 위한 우선변제권 제도를 두고 있다.',
        isError: false
      },
      {
        tag: '조건',
        text: '우선변제권 행사를 위해서는 입주 후 전입신고와 확정일자를 받아야 한다.',
        isError: false
      },
      {
        tag: '효과',
        text: '두 요건을 모두 충족하면 임차인은 보증금에 대해 후순위 채권자보다 우선 변제받을 권리를 갖는다.',
        isError: false
      },
      {
        tag: '결론',
        text: '따라서 임차인은 계약 직후 동주민센터에서 전입신고와 확정일자 처리를 함께 진행할 것이 권장된다.',
        isError: false
      }
    ]
  },
  {
    id: 'N3',
    type: 'noise',
    domain: 'finance',
    scenario: '당신은 첫 월급으로 적금을 들지 펀드를 들지 고민하며 AI에게 조언을 구하고 있습니다.',
    chunks: [
      {
        tag: '주장',
        text: '본 분석은 20대 사회초년생의 신용카드 사용 패턴이 신용점수에 미치는 영향을 살펴보았다.',
        isError: false
      },
      {
        tag: '조건',
        text: '한도 대비 사용액 비율이 30% 이하로 유지되는 경우 신용점수 상승에 긍정적 영향을 미쳤다.',
        isError: false
      },
      {
        tag: '결과',
        text: '반면 50%를 초과하는 사용 패턴이 6개월 이상 지속되면 신용점수가 평균 40점 하락하였다.',
        isError: false
      },
      {
        tag: '결론',
        text: '사회초년생은 신용카드 한도 대비 사용액을 30% 이내로 관리하는 것이 권장된다.',
        isError: false
      }
    ]
  }
];
