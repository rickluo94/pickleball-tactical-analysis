import { useEffect, useMemo, useRef, useState } from 'react';
import ProfileCard from './components/ProfileCard';

type Point = {
  x: number;
  y: number;
};

type Bounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type DragTarget =
  | 'attackFan'
  | 'attackRange'
  | 'ball'
  | 'ballFan'
  | 'ballRange'
  | 'defender'
  | 'defenderFan'
  | 'defenderRange'
  | 'hit'
  | 'opponent'
  | 'opponentFan'
  | 'opponentRange';

type Controls = {
  angle: number;
  attackRange: number;
  hit: Point;
  ball: Point;
  ballAngle: number;
  ballRange: number;
  defender: Point;
  defAngle: number;
  defRange: number;
  opponent: Point;
  opponentAngle: number;
  opponentRange: number;
};

type QuizOption = 'A' | 'B' | 'C' | 'D';

type CareerType = 'pending' | 'berserker' | 'paladin' | 'mage' | 'assassin' | 'druid';

type QuizQuestion = {
  id: number;
  prompt: string;
  image: string;
  options: Record<QuizOption, string>;
  dType?: 'assassin' | 'druid';
};

type CareerProfile = {
  title: string;
  english: string;
  trait: string;
  description: string;
  image?: string;
  resultPage?: string;
};

type InventoryItem = {
  id: string;
  name: string;
  roles: string[];
  cover: string | null;
  shop: string | null;
  images: string[];
};

const VIEWBOX_WIDTH = 520;
const VIEWBOX_HEIGHT = 1024;
const COURT_CENTER_X = 260;
const DEFENDER_HOME: Point = { x: 260, y: 796 };
const OPPONENT_HOME: Point = { x: 110, y: 120 };
const INCOMING_HOME: Point = { x: 149, y: 909 };
const HIT_BOUNDS: Bounds = { minX: 65, maxX: 455, minY: 70, maxY: 502 };
const BALL_BOUNDS: Bounds = { minX: 65, maxX: 455, minY: 532, maxY: 954 };
const DEFENDER_BOUNDS: Bounds = { minX: 65, maxX: 455, minY: 532, maxY: 954 };
const OPPONENT_BOUNDS: Bounds = { minX: 65, maxX: 455, minY: 70, maxY: 502 };
const RANGE_HANDLE_OFFSET = 28;
const FAN_CIRCLE_GAP = 34;
const ATTACK_FAN = 20;
const DEF_FAN = 20;
const OPPONENT_FAN = 20;
const BALL_FAN = 20;

const initialControls: Controls = {
  angle: 0,
  attackRange: 680,
  hit: { x: 348, y: 261 },
  ball: { x: 149, y: 909 },
  ballAngle: 0,
  ballRange: 120,
  defender: { x: 260, y: 796 },
  defAngle: 0,
  defRange: 410,
  opponent: { ...OPPONENT_HOME },
  opponentAngle: 0,
  opponentRange: 120,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: clamp(Math.round(point.x), bounds.minX, bounds.maxX),
    y: clamp(Math.round(point.y), bounds.minY, bounds.maxY),
  };
}

function pointFrom(origin: Point, deg: number, len: number): Point {
  const rad = (deg * Math.PI) / 180;
  return {
    x: origin.x + Math.cos(rad) * len,
    y: origin.y + Math.sin(rad) * len,
  };
}

function fanBandPath(origin: Point, leftDeg: number, rightDeg: number, outerRadius: number, innerRadius: number) {
  const outerLeft = pointFrom(origin, leftDeg, outerRadius);
  const outerRight = pointFrom(origin, rightDeg, outerRadius);
  const innerLeft = pointFrom(origin, leftDeg, innerRadius);
  const innerRight = pointFrom(origin, rightDeg, innerRadius);

  return [
    `M ${innerLeft.x} ${innerLeft.y}`,
    `L ${outerLeft.x} ${outerLeft.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerRight.x} ${outerRight.y}`,
    `L ${innerRight.x} ${innerRight.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerLeft.x} ${innerLeft.y}`,
    'Z',
  ].join(' ');
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function routeName(angle: number) {
  if (angle > 30) return '大角度對角攻擊';
  if (angle < -30) return '大角度對角攻擊';
  if (angle > 10) return '中線偏左';
  if (angle < -10) return '中線偏右';
  return '正面回擊';
}

function pct(n: number) {
  return clamp(Math.round(n), 0, 100);
}

function normalizeAngle(deg: number) {
  let normalized = deg;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

function svgLine(a: Point, b: Point) {
  return {
    x1: a.x,
    y1: a.y,
    x2: b.x,
    y2: b.y,
  };
}

function assetPath(fileName: string) {
  return `${import.meta.env.BASE_URL}assets/${fileName}`;
}

function RangeField({
  label,
  value,
  min,
  max,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <>
      <label>
        {label} <span className="num">{value}{suffix}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </>
  );
}

function SiteNav() {
  return (
    <nav className="site-nav" aria-label="主要導覽">
      <h1 className="site-nav-title">
        <a href="index.html">Pickle Today 冒險的起點！</a>
      </h1>
      <div className="site-nav-links">
        <a className="site-nav-link" href="quiz.html">匹克職業傾向測驗</a>
        <a className="site-nav-link" href="inventory.html">裝備背包</a>
        <a className="site-nav-link" href="course.html">技能修練</a>
        <a className="site-nav-link" href="friendly-schedule.html">友誼賽程</a>
        <a className="site-nav-link" href="tips.html">Tips小技巧</a>
        <a className="site-nav-link" href="pickleball-mixer.html">守擂賽</a>
        <a className="site-nav-link" href="tactical-analysis.html">戰術分析工具</a>
      </div>
    </nav>
  );
}

const inventoryItems: InventoryItem[] = [
  {
    id: 'XSPAK_PRO_LH',
    name: 'XSPAK_PRO_LH',
    roles: ['匹克德魯伊', '匹克聖騎士', '匹克刺客'],
    cover: 'paddle/XSPAK_PRO_LH/5445abc21ecfbca.jpg',
    shop: 'https://shopee.tw/product/1345340496/57063453466/',
    images: [
      'paddle/XSPAK_PRO_LH/5445abc21ecfbca.jpg',
      'paddle/XSPAK_PRO_LH/efc10db8747bfae.jpg',
      'paddle/XSPAK_PRO_LH/b5a2e841a9d34b9.jpg',
      'paddle/XSPAK_PRO_LH/636d245a690b.jpg',
    ],
  },
  {
    id: 'XSPAK_EXTRASPIN_1_0_12K',
    name: 'XSPAK_EXTRASPIN_1_0_12K',
    roles: ['匹克聖騎士', '匹克刺客'],
    cover: 'paddle/XSPAK_EXTRASPIN_1_0_12K/ea1681e82f9a3ab.jpg',
    shop: 'https://shopee.tw/product/1345340496/50413460817/',
    images: [
      'paddle/XSPAK_EXTRASPIN_1_0_12K/ea1681e82f9a3ab.jpg',
      'paddle/XSPAK_EXTRASPIN_1_0_12K/4d067d98e0c5684.jpg',
      'paddle/XSPAK_EXTRASPIN_1_0_12K/d505fc5afd55ab2.jpg',
      'paddle/XSPAK_EXTRASPIN_1_0_12K/153710bc0b0b.jpg',
      'paddle/XSPAK_EXTRASPIN_1_0_12K/1ec24682d0f1dac.jpg',
    ],
  },
  {
    id: 'YC_DGYCASI_T700',
    name: 'YC_DGYCASI_T700',
    roles: ['匹克德魯伊', '匹克聖騎士'],
    cover: 'paddle/YC_DGYCASI_T700/tw-11134207-81ztg-mfkwu1w9li4q04@resize_w450_nl.webp',
    shop: 'https://shopee.tw/product/1345340496/51563453386/',
    images: [
      'paddle/YC_DGYCASI_T700/tw-11134207-81ztg-mfkwu1w9li4q04@resize_w450_nl.webp',
      'paddle/YC_DGYCASI_T700/tw-11134207-81ztm-mfkwu1xhszkcbd@resize_w450_nl.webp',
      'paddle/YC_DGYCASI_T700/71B7h0lAI2L._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/71Sg1oPJdWL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/tw-11134207-81zth-mfkwtvc29oul55.webp',
      'paddle/YC_DGYCASI_T700/71Dkgu1bahL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/61uvNGmC6pL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/71s-e5nIAqL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/81vK-bYV8LL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/71YiUHf2OOL._AC_SL1500_.jpg',
      'paddle/YC_DGYCASI_T700/tw-11134207-81ztm-mfkwu1xrtzik81@resize_w450_nl.webp',
    ],
  },
  {
    id: 'YC_DGYCASI_PRO_MAX',
    name: 'YC_DGYCASI_PRO_MAX',
    roles: ['匹克狂戰士', '匹克刺客', '匹克法師'],
    cover: 'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0p-mb6hnc611gief0.webp',
    shop: 'https://shopee.tw/product/1345340496/57513449297/',
    images: [
      'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0p-mb6hnc611gief0.webp',
      'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0p-mb6hnc612v2ua1@resize_w450_nl.webp',
      'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0p-mb6hokwfktsm71@resize_w450_nl.webp',
      'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0s-mb6homjj6cewe5@resize_w450_nl.webp',
      'paddle/YC_DGYCASI_PRO_MAX/tw-11134207-7ra0u-mb6hnc611gm0ff@resize_w450_nl.webp',
    ],
  },
  {
    id: 'BGM_72006',
    name: 'BGM_72006',
    roles: ['匹克狂戰士', '匹克刺客', '匹克法師','匹克德魯伊'],
    cover: 'shoes/BGM_72006/1770954871_8d267ee2c10a9a0cb0dd.avif',
    shop: null,
    images: [
      'shoes/BGM_72006/1770954871_503d6c83c792044bd91f.avif',
      'shoes/BGM_72006/1770954871_a147d48e308bc2267ae0.avif',
      'shoes/BGM_72006/1770955026_a165587ced5d9e6c0c01.avif',
      'shoes/BGM_72006/1770954871_8d267ee2c10a9a0cb0dd.avif',
      'shoes/BGM_72006/1770954871_eb78009887833286a541.avif',
      'shoes/BGM_72006/1770954871_d416272ef0ac9476376d.avif',
      'shoes/BGM_72006/1770954971_d595b661455c1df45dde.avif',
      'shoes/BGM_72006/1770954871_1588e7794ab5ea938013.avif',
      'shoes/BGM_72006/1770263137_7541cbc75ec242d87e77.avif',
      'shoes/BGM_72006/1770954871_0465db84917c2f2c0de9.avif',
      'shoes/BGM_72006/1770954871_a47331d3616fcb766cce.avif',
      'shoes/BGM_72006/1770954871_94f1ccbec55555e6acd3.avif',
      'shoes/BGM_72006/1770954871_b4c438eb6e64c2def5f0.avif',
    ],
  },
  {
    id: 'Overgrip_v1',
    name: 'Overgrip_v1',
    roles: ['補給品'],
    cover: 'paddle/Overgrip_v1/tw-11134207-7ra0k-md6spi1tvygv55.webp',
    shop: 'https://shopee.tw/product/1345340496/49213478985/',
    images: ['paddle/Overgrip_v1/tw-11134207-7ra0k-md6spi1tvygv55.webp'],
  },
];

const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    prompt: '當對手打出一顆非常高、有機會直接得分的網前高球（Pop-up）時，你的第一直覺反應是？',
    image: 'q1_img.webp',
    dType: 'druid',
    options: {
      A: '全力起跳，用最猛烈的殺球（Smash）把球砸向對手腳邊',
      B: '冷靜觀察對手的站位，輕柔地將球點進沒人防守的廚房線死角',
      C: '帶上強烈切旋將球壓低，讓球落地後怪異彈跳使對方無法回擊',
      D: '視情況而定，如果隊友已經上前就打點，隊友在後方就穩健過渡',
    },
  },
  {
    id: 2,
    prompt: '在雙打比賽中，你最喜歡與哪一種打法特質的隊友組隊？',
    image: 'q2_img.webp',
    dType: 'druid',
    options: {
      A: '能夠瘋狂進攻、幫我製造最後一擊機會的重砲手',
      B: '穩如泰山、能接下所有重扣並重設球速（Reset）的防守大師',
      C: '腳步輕盈、隨時能利用邊線出奇制勝的靈活跑者',
      D: '甚麼球都能打、能攻能守且隨時可以配合我戰術切換的萬金油',
    },
  },
  {
    id: 3,
    prompt: '當你被對手連續重扣、陷入極度被動的防守劣勢時，你通常會怎麼應對？',
    image: 'q3_img.webp',
    dType: 'assassin',
    options: {
      A: '找機會硬碰硬，直接在底線跟對手對抽重球拼輸贏',
      B: '展現極限耐性，專注於接下重扣並打出細膩的過渡吊球（Drop Shot）',
      C: '用詭譎的切旋球改變球速，試圖破壞對手的連續進攻節奏',
      D: '步伐保持輕盈，一邊穩健防守一邊尋找對手露出的防線死角',
    },
  },
  {
    id: 4,
    prompt: '你認為在匹克球場上，最讓你感到痛快、有成就感的瞬間是？',
    image: 'q4_img.webp',
    dType: 'assassin',
    options: {
      A: '用絕對的力量與速度正面貫穿對手的防線',
      B: '靠著滴水不漏的完美防守，直到對手自己失去耐性失誤',
      C: '打出一顆強烈上旋或側旋，看著對手判斷失誤打鐵',
      D: '利用極刁鑽的斜對角球（Cross-court）劃破球場死角得分',
    },
  },
  {
    id: 5,
    prompt: '關於網前的「廚房線（Non-Volley Zone）」爭奪戰，你的核心戰術通常是？',
    image: 'q5_img.webp',
    dType: 'druid',
    options: {
      A: '不想跟對方慢慢磨，找機會就要發力重抽打破僵局',
      B: '享受一顆顆柔和的短吊球（Dink），靠耐性拖垮對手',
      C: '在短吊球中加入不同的上旋或下旋，讓對手接得極為難受',
      D: '隨時準備切換節奏，前一拍溫柔吊球，下一拍立刻變身重砲手',
    },
  },
  {
    id: 6,
    prompt: '比賽進行到關鍵局，你的發球局到了。此時你最想發出什麼樣的球？',
    image: 'q6_img.webp',
    dType: 'assassin',
    options: {
      A: '貼著網頂、球速極快的強力平擊發球，直接壓迫對方到底線',
      B: '落點很深、高度適中但極其穩健的發球，保證自己不失誤',
      C: '帶著強烈側旋或上旋的變化球，讓球落地跳向意想不到的方向',
      D: '發向對手兩人的中央地帶，或是他們比較不擅長的反手拍空檔',
    },
  },
  {
    id: 7,
    prompt: '當你發現對手有「退到底線後方」的防守習慣，你會採取什麼攻擊策略？',
    image: 'q7_img.webp',
    dType: 'assassin',
    options: {
      A: '在底線瘋狂與對方展開重抽大戰，用力量壓垮對方',
      B: '故意把球吸得很短、很貼網，逼對方必須大範圍向前奔跑極限救球',
      C: '瘋狂摩擦球皮打出極深的上旋球，讓球落地後快速向前衝衝擊對方',
      D: '利用對手退後產生的空檔，打出大角度的斜線，將對方徹底調離防守位置',
    },
  },
  {
    id: 8,
    prompt: '當你面對對手連續不斷的猛烈重扣攻擊時，你最直覺、也最常做出的回擊方式是？',
    image: 'q8_img.webp',
    dType: 'assassin',
    options: {
      A: '用更大的力氣跟對手正面對抽，試圖用更快的速度正面壓制回去',
      B: '輕柔收力回擊，將球速完全重設（Reset），讓球軟綿綿地貼著網子落下進入廚房線',
      C: '拍面大力一削，送出一顆超強的下旋球，試圖破壞對方的擊球節奏',
      D: '腳步迅速往側邊大跨一步，直接在空中大角度將球截擊切入邊線',
    },
  },
  {
    id: 9,
    prompt: '當你的隊友在場上突然體力下滑、失誤變多，導致陷入僵局時，你通常會採取什麼樣的打法調整？',
    image: 'q9_img.webp',
    dType: 'assassin',
    options: {
      A: '增加主動發力攻擊的次數，試圖用個人突破與力量強攻來幫隊友分擔壓力',
      B: '轉為極端保守的防守狀態，大範圍幫隊友補位，用極高的容錯率穩住局面',
      C: '提高球的旋轉度與變化，試圖讓對手回擊品質下降，替隊友製造好打的球',
      D: '隨時觀察對手露出的死角，不拼體力，專挑對方兩人之間的空檔打刁鑽角度',
    },
  },
  {
    id: 10,
    prompt: '如果你在場上看到對手兩個人都擠在球場正中央、防線大開時，你的最佳擊球選擇會是？',
    image: 'q10_img.webp',
    dType: 'assassin',
    options: {
      A: '對準其中一人的胸口或腳邊，用盡全身力氣打出一顆超高速的正面追身球',
      B: '穩穩地把球送回對手腳下，繼續跟對方在網前耐心地打短吊球磨耐性',
      C: '順著風向或擊球慣性，打出一顆帶有強烈上旋或側旋的怪異彈跳球',
      D: '打出一顆大角度的斜對角球（Cross-court），讓球精準落在邊線與廚房線的交界死角',
    },
  },
];

const careerProfiles: Record<CareerType, CareerProfile> = {
  pending: {
    title: '等待作答',
    english: '',
    trait: '完成測驗後判定',
    description: '請依照直覺選擇最接近你的打法。系統會統計 A、B、C、D 的總數，並在 D 選項最多時依照題目脈絡判斷你偏向潛行刺客或德魯伊。',
  },
  berserker: {
    title: '匹克狂戰士',
    english: 'Berserker',
    trait: '力量強攻派',
    image: '匹克狂戰士.webp',
    resultPage: 'result-berserker.html',
    description: '「進攻就是最好的防守！」你擁有無與倫比的進攻慾望與力量爆發。底線重抽與網前重扣是你的招牌技能。你追求用球速直接貫穿對手的防線，是不給對手任何喘息空間的絕對進攻核心。',
  },
  paladin: {
    title: '匹克聖騎士',
    english: 'Paladin',
    trait: '防禦控制派',
    image: '匹克聖戰士.webp',
    resultPage: 'result-paladin.html',
    description: '「銅牆鐵壁，堅不可摧。」你是球場上最穩健的盾牌。擁有驚人的耐心與細膩手感，擅長吸收對手的所有重扣，並將球速完美重設（Reset）。你用無解的防守磨光對手的耐性，直到對方自亂陣腳。',
  },
  mage: {
    title: '匹克法師',
    english: 'Mage',
    trait: '旋轉派',
    image: '匹克法師.webp',
    resultPage: 'result-mage.html',
    description: '「軌跡多變，變幻莫測。」你擊出的每一顆球都像是附加了狀態異常（Debuff）。你擅長操控強烈的上旋、下旋與側旋，讓球落地後產生極其詭譎的彈跳。對手在你面前往往頻頻打鐵，完全抓不到擊球節奏。',
  },
  assassin: {
    title: '匹克刺客',
    english: 'Assassin',
    trait: '角度派',
    image: '匹克刺客.webp',
    resultPage: 'result-assassin.html',
    description: '「不拼蠻力，一擊必殺。」你是步伐輕盈的球場藝術家。你不會一味盲目發力，而是像老練的獵人一樣，冷靜捕捉對手陣型拉開的瞬間。利用大角度斜對角、極邊線球等刁鑽落點，直接切入對手意想不到的死角。',
  },
  druid: {
    title: '匹克德魯伊',
    english: 'Druid',
    trait: '全能派',
    image: '匹克德魯伊.webp',
    resultPage: 'result-druid.html',
    description: '「形態百變，隨機應變。」你是雙打搭檔最想遇到的萬金油隊友。能攻能守的你，前一拍還在和對手溫柔地網前鬥小球，下一拍抓到機會立刻化身重砲手。你能根據戰局和隊友狀態隨時切換形態，是全方位的戰術家。',
  },
};

function getQuizResult(answers: Partial<Record<number, QuizOption>>) {
  const counts: Record<QuizOption, number> = { A: 0, B: 0, C: 0, D: 0 };
  let assassinD = 0;
  let druidD = 0;

  quizQuestions.forEach((question) => {
    const answer = answers[question.id];
    if (!answer) return;
    counts[answer] += 1;
    if (answer === 'D') {
      if (question.dType === 'druid') druidD += 1;
      if (question.dType === 'assassin') assassinD += 1;
    }
  });

  const maxCount = Math.max(...Object.values(counts));
  if (maxCount === 0) {
    return { profile: careerProfiles.pending, counts, assassinD, druidD };
  }

  const leaders = (Object.keys(counts) as QuizOption[]).filter((option) => counts[option] === maxCount);
  if (leaders.includes('D')) {
    return {
      profile: druidD >= 2 ? careerProfiles.druid : careerProfiles.assassin,
      counts,
      assassinD,
      druidD,
    };
  }

  if (leaders.includes('A')) return { profile: careerProfiles.berserker, counts, assassinD, druidD };
  if (leaders.includes('B')) return { profile: careerProfiles.paladin, counts, assassinD, druidD };
  return { profile: careerProfiles.mage, counts, assassinD, druidD };
}

function encodeQuizAnswers(answers: Partial<Record<number, QuizOption>>) {
  const optionMap: Record<QuizOption, number> = { A: 0, B: 1, C: 2, D: 3 };
  let packed = 0;

  quizQuestions.forEach((question) => {
    const answer = answers[question.id];
    packed = (packed << 2) | (answer ? optionMap[answer] : 0);
  });

  return (packed ^ 0x8f3a5).toString(36);
}

function decodeQuizAnswers(encoded: string | null): Partial<Record<number, QuizOption>> {
  if (!encoded) return {};

  const parsed = Number.parseInt(encoded, 36);
  if (!Number.isFinite(parsed)) return {};

  let packed = parsed ^ 0x8f3a5;
  const options: QuizOption[] = ['A', 'B', 'C', 'D'];
  const nextAnswers: Partial<Record<number, QuizOption>> = {};

  for (let index = quizQuestions.length - 1; index >= 0; index -= 1) {
    const optionValue = packed & 0b11;
    nextAnswers[quizQuestions[index].id] = options[optionValue];
    packed >>= 2;
  }

  return packed === 0 ? nextAnswers : {};
}

function hasCompleteQuizAnswers(answers: Partial<Record<number, QuizOption>>) {
  return quizQuestions.every((question) => Boolean(answers[question.id]));
}

function QuizPage() {
  const initialAnswers = decodeQuizAnswers(new URLSearchParams(window.location.search).get('result'));
  const hasSharedResult = hasCompleteQuizAnswers(initialAnswers);
  const [answers, setAnswers] = useState<Partial<Record<number, QuizOption>>>(initialAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<'quiz' | 'result'>(hasSharedResult ? 'result' : 'quiz');
  const [quizMessage, setQuizMessage] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === quizQuestions.length;
  const currentQuestion = quizQuestions[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === quizQuestions.length - 1;
  const result = getQuizResult(answers);
  const currentQuestionImage = (() => {
    if (currentQuestion.id === 2 && answers[1] === 'A') return 'q2-1_img.webp';
    if (currentQuestion.id === 6 && answers[5] === 'D') return 'q6-1_img.webp';
    if (currentQuestion.id === 7 && answers[6] === 'A') return 'q7-1_img.webp';
    if (currentQuestion.id === 9 && answers[8] === 'A') return 'q9-1_img.webp';
    if (currentQuestion.id === 10 && answers[9] === 'A') return 'q10-1_img.webp';
    return currentQuestion.image;
  })();

  function updateAnswer(questionId: number, option: QuizOption) {
    setAnswers((current) => ({ ...current, [questionId]: option }));
    window.history.replaceState({}, '', `${window.location.pathname}`);
    setQuizMessage('');
    setShareMessage('');
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
    setQuizMessage('');
  }

  function goNext() {
    if (!answers[currentQuestion.id]) {
      setQuizMessage('請先選擇一個答案。');
      return;
    }

    setCurrentIndex((index) => Math.min(quizQuestions.length - 1, index + 1));
    setQuizMessage('');
  }

  function analyzeResult() {
    if (!answers[currentQuestion.id]) {
      setQuizMessage('請先選擇一個答案。');
      return;
    }

    if (!isComplete) {
      setQuizMessage(`還有 ${quizQuestions.length - answeredCount} 題尚未完成。`);
      return;
    }

    setView('result');
    setQuizMessage('');
    setShareMessage('');
    window.history.replaceState({}, '', `${result.profile.resultPage ?? 'quiz.html'}?result=${encodeQuizAnswers(answers)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetQuiz() {
    setAnswers({});
    setCurrentIndex(0);
    setView('quiz');
    setQuizMessage('');
    setShareMessage('');
    window.history.replaceState({}, '', 'quiz.html');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnToQuiz() {
    setView('quiz');
    setShareMessage('');
    window.history.replaceState({}, '', 'quiz.html');
  }

  async function copyShareUrl() {
    const shareUrl = window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage('已複製分享連結');
    } catch {
      const input = document.getElementById('quiz-share-url') as HTMLInputElement | null;
      input?.select();
      setShareMessage('已選取連結，請手動複製');
    }
  }

  async function imageUrlToPngBlob(imageUrl: string) {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('圖片載入失敗'));
      image.src = imageUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('無法建立圖片畫布');

    context.drawImage(image, 0, 0);

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('圖片轉換失敗'));
        }
      }, 'image/png');
    });
  }

  async function createResultImageFile() {
    if (!result.profile.image) throw new Error('目前沒有可分享的結果圖片');

    const imageUrl = new URL(assetPath(result.profile.image), window.location.href).href;
    const pngBlob = await imageUrlToPngBlob(imageUrl);
    return new File([pngBlob], `${result.profile.english || result.profile.title}.png`, { type: pngBlob.type });
  }

  async function shareResultImage() {
    try {
      const resultImageFile = await createResultImageFile();
      const shareData: ShareData = {
        title: result.profile.title,
        text: result.profile.trait,
        files: [resultImageFile],
      };

      if (!navigator.share || (navigator.canShare && !navigator.canShare(shareData))) {
        throw new Error('瀏覽器不支援圖片分享');
      }

      await navigator.share(shareData);
      setShareMessage('已開啟圖片分享');
    } catch {
      setShareMessage('此瀏覽器不支援直接分享圖片，請長按結果圖片儲存或使用複製連結');
    }
  }

  if (view === 'result') {
    return (
      <main className="quiz-page">
        <section className="quiz-result-page">
          <div className="quiz-result-showcase">
            {result.profile.image && (
              <ProfileCard
                className="quiz-profile-card"
                name={result.profile.title}
                title={result.profile.trait}
                handle={result.profile.english || result.profile.title}
                status="Pickle Today"
                contactText="Share"
                avatarUrl={assetPath(result.profile.image)}
                showUserInfo={false}
                enableTilt
                enableMobileTilt={false}
                behindGlowColor="rgba(125, 190, 255, 0.1)"
                behindGlowEnabled={true}
                innerGradient="linear-gradient(145deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.08) 100%)"
              />
            )}
            <div className="quiz-result-card quiz-result-card-large">
              <span className="quiz-result-label">測驗結果</span>
              <h2>{result.profile.title}</h2>
              <p className="quiz-result-subtitle">{result.profile.trait}</p>
              {/*<div className="quiz-counts">*/}
              {/*  <span>A {result.counts.A}</span>*/}
              {/*  <span>B {result.counts.B}</span>*/}
              {/*  <span>C {result.counts.C}</span>*/}
              {/*  <span>D {result.counts.D}</span>*/}
              {/*</div>*/}
              <p>{result.profile.description}</p>
              {/*{result.counts.D > 0 && (*/}
              {/*  <p className="quiz-d-note">D 細分：角度/死角 {result.assassinD} 題，全能/補位 {result.druidD} 題。</p>*/}
              {/*)}*/}
              <label className="quiz-share-label" htmlFor="quiz-share-url">分享結果連結</label>
              <div className="quiz-share-row">
                <input
                  id="quiz-share-url"
                  className="quiz-share-url"
                  readOnly
                  value={window.location.href}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button type="button" className="quiz-copy-button" onClick={copyShareUrl}>複製</button>
                <button type="button" className="quiz-copy-button" onClick={shareResultImage}>分享圖片</button>
              </div>
              {shareMessage && <p className="quiz-share-status">{shareMessage}</p>}
              <div className="quiz-actions">
                <button type="button" onClick={returnToQuiz}>返回修改答案</button>
                <button type="button" className="secondary" onClick={resetQuiz}>重新作答</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-page">
      <section className="quiz-hero">
        <div>
          <p className="quiz-kicker">Pickle Today 測驗所</p>
          <h2>匹克職業傾向測驗</h2>
          <p>10 題情境選擇，找出你的核心匹克職業流派。</p>
        </div>
        <div className="quiz-progress" aria-label="作答進度">
          <strong>{currentIndex + 1}</strong>
          <span>/ {quizQuestions.length} 題</span>
        </div>
      </section>

      <section className="quiz-step">
        <article className="quiz-question">
          <div className="quiz-step-meta">
            <span>已完成 {answeredCount} / {quizQuestions.length}</span>
          </div>
          <h3>Q{currentQuestion.id}. {currentQuestion.prompt}</h3>
          <figure className="quiz-question-media">
            <img src={assetPath(currentQuestionImage)} alt={`Q${currentQuestion.id} 情境示意圖`} />
          </figure>
          <div className="quiz-options">
            {(Object.keys(currentQuestion.options) as QuizOption[]).map((option) => (
              <label className={`quiz-option ${answers[currentQuestion.id] === option ? 'selected' : ''}`} key={option}>
                <input
                  type="radio"
                  name={`question-${currentQuestion.id}`}
                  checked={answers[currentQuestion.id] === option}
                  onChange={() => updateAnswer(currentQuestion.id, option)}
                />
                <span className="quiz-option-key">{option}</span>
                <span>{currentQuestion.options[option]}</span>
              </label>
            ))}
          </div>
          {quizMessage && <p className="quiz-alert">{quizMessage}</p>}
          <div className="quiz-actions">
            <button type="button" className="secondary" onClick={goPrevious} disabled={isFirstQuestion}>上一題</button>
            {!isLastQuestion ? (
              <button type="button" onClick={goNext}>下一題</button>
            ) : (
              <button type="button" className="quiz-analyze" onClick={analyzeResult}>分析結果</button>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function HomeBanner() {
  return (
    <>
      <picture className="home-banner">
        <source media="(max-width: 640px)" srcSet={assetPath('banner_phone.webp')} />
        <img src={assetPath('banner_web.webp')} alt="Pickle Today" />
      </picture>
      <section className="home-contact" aria-label="聯絡資訊">
        <span>聯絡資訊</span>
        <a href="https://www.threads.com/@sanmo_daily" target="_blank" rel="noreferrer">
          @sanmo_daily
        </a>
      </section>
    </>
  );
}

function inventoryItemCover(item: InventoryItem) {
  return item.cover ?? item.images[0] ?? null;
}

function InventoryPage() {
  const [selectedId, setSelectedId] = useState(inventoryItems[0].id);
  const [imageIndex, setImageIndex] = useState(0);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isClickHintActive, setIsClickHintActive] = useState(true);
  const selectedItem = inventoryItems.find((item) => item.id === selectedId) ?? inventoryItems[0];
  const selectedImage = selectedItem.images[imageIndex] ?? inventoryItemCover(selectedItem);
  const hasMultipleImages = selectedItem.images.length > 1;

  function selectItem(itemId: string) {
    setSelectedId(itemId);
    setImageIndex(0);
    setIsDetailOpen(true);
    setIsClickHintActive(false);
  }

  function goDetailImage(direction: -1 | 1) {
    setImageIndex((current) => {
      const total = selectedItem.images.length;
      return (current + direction + total) % total;
    });
  }

  useEffect(() => {
    if (!isDetailOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDetailOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen]);

  useEffect(() => {
    const hintTimer = window.setTimeout(() => setIsClickHintActive(false), 4200);
    return () => window.clearTimeout(hintTimer);
  }, []);

  return (
    <main className="inventory-page">
      <section className="inventory-layout">
        <div className="inventory-board" aria-label="Inventory 物品欄">
          <img className="inventory-frame" src={assetPath('inventory/Inventory.webp')} alt="" aria-hidden="true" />
          <div className={`inventory-grid ${isClickHintActive ? 'hint-active' : ''}`}>
            {inventoryItems.map((item) => {
              const cover = inventoryItemCover(item);
              return (
                <button
                  type="button"
                  className={`inventory-slot ${selectedItem.id === item.id ? 'selected' : ''}`}
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  aria-pressed={selectedItem.id === item.id}
                >
                  {cover ? <img src={assetPath(cover)} alt={item.name} /> : <span>{item.name}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>
      {isDetailOpen && (
        <div className="inventory-drawer-shell" role="presentation" onClick={() => setIsDetailOpen(false)}>
          <aside
            className="inventory-detail inventory-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="物品細節"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="inventory-drawer-close"
              onClick={() => setIsDetailOpen(false)}
              aria-label="關閉物品細節"
            >
              ←
            </button>
            <div className="inventory-detail-image">
              {selectedItem.shop && <span className="inventory-shop-badge">外站商品</span>}
              {selectedImage ? (
                <img src={assetPath(selectedImage)} alt={`${selectedItem.name} 放大圖`} />
              ) : (
                <span className="inventory-empty-image">尚無圖片</span>
              )}
            </div>
            <div className="inventory-detail-info">
              <span className="inventory-detail-label">當前選擇物品</span>
              <h2>{selectedItem.name}</h2>
              <div className="inventory-role-list">
                {selectedItem.roles.map((role) => (
                  <span key={role}>{role}</span>
                ))}
              </div>
              {selectedItem.shop && (
                <a className="inventory-shop-link" href={selectedItem.shop} target="_blank" rel="noreferrer">
                  查看武器詳情
                  <span aria-hidden="true">→</span>
                </a>
              )}
              <div className="inventory-detail-actions">
                <button type="button" className="secondary" onClick={() => goDetailImage(-1)} disabled={!hasMultipleImages}>上一張</button>
                <span>{imageIndex + 1} / {selectedItem.images.length}</span>
                <button type="button" onClick={() => goDetailImage(1)} disabled={!hasMultipleImages}>下一張</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function App() {
  const [controls, setControls] = useState<Controls>(initialControls);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const timerRef = useRef<number | null>(null);
  const courtRef = useRef<SVGSVGElement | null>(null);
  const isTacticalPage = window.location.pathname.endsWith('/tactical-analysis.html');
  const isQuizPage = window.location.pathname.endsWith('/quiz.html') || /\/result-[a-z]+\.html$/.test(window.location.pathname);
  const isInventoryPage = window.location.pathname.endsWith('/inventory.html');

  const derived = useMemo(() => {
    const opponentBaseDeg = Math.atan2(controls.defender.y - controls.opponent.y, controls.defender.x - controls.opponent.x) * 180 / Math.PI;
    const opponentAimDeg = opponentBaseDeg + controls.opponentAngle;
    const opponentMainEnd = pointFrom(controls.opponent, opponentAimDeg, controls.opponentRange);

    const baseDeg = Math.atan2(controls.hit.y - controls.ball.y, controls.hit.x - controls.ball.x) * 180 / Math.PI + 180;
    const shotDeg = baseDeg + controls.angle;
    const mainEnd = pointFrom(controls.hit, shotDeg, controls.attackRange);

    const ballBaseDeg = Math.atan2(controls.hit.y - controls.ball.y, controls.hit.x - controls.ball.x) * 180 / Math.PI;
    const ballAimDeg = ballBaseDeg + controls.ballAngle;
    const ballMainEnd = pointFrom(controls.ball, ballAimDeg, controls.ballRange);

    const defBaseDeg = Math.atan2(controls.hit.y - controls.defender.y, controls.hit.x - controls.defender.x) * 180 / Math.PI;
    const defAimDeg = defBaseDeg + controls.defAngle;
    const defMainEnd = pointFrom(controls.defender, defAimDeg, controls.defRange);

    const name = routeName(controls.angle);
    const attackSide = controls.hit.x > COURT_CENTER_X ? 1 : -1;
    const defenderBias = (controls.defender.x - COURT_CENTER_X) * attackSide;
    const lineRisk = pct(55 + controls.angle * 0.75 + (controls.hit.x - COURT_CENTER_X) * 0.08 - defenderBias * 0.12);
    const crossRisk = pct(55 - controls.angle * 0.75 + Math.abs(controls.hit.x - COURT_CENTER_X) * 0.07 + defenderBias * 0.06);

    let suggestion = '目前直線與對角威脅接近，建議守中間偏對手拍面方向。';
    if (lineRisk > crossRisk + 15) {
      suggestion = '直線空間較大，防守者可往對手所在側微移。';
    } else if (crossRisk > lineRisk + 15) {
      suggestion = '對角角度較大，防守者需注意斜線穿越。';
    }

    return {
      opponentAimDeg,
      opponentMainEnd,
      opponentLeftEnd: pointFrom(controls.opponent, opponentAimDeg - OPPONENT_FAN, controls.opponentRange),
      opponentRightEnd: pointFrom(controls.opponent, opponentAimDeg + OPPONENT_FAN, controls.opponentRange),
      opponentHandle: pointFrom(controls.opponent, opponentAimDeg, controls.opponentRange + RANGE_HANDLE_OFFSET),
      opponentFanPath: fanBandPath(controls.opponent, opponentAimDeg - OPPONENT_FAN, opponentAimDeg + OPPONENT_FAN, controls.opponentRange, FAN_CIRCLE_GAP),
      shotDeg,
      mainEnd,
      leftEnd: pointFrom(controls.hit, shotDeg - ATTACK_FAN, controls.attackRange),
      rightEnd: pointFrom(controls.hit, shotDeg + ATTACK_FAN, controls.attackRange),
      attackHandle: pointFrom(controls.hit, shotDeg, controls.attackRange + RANGE_HANDLE_OFFSET),
      fanPath: fanBandPath(controls.hit, shotDeg - ATTACK_FAN, shotDeg + ATTACK_FAN, controls.attackRange, FAN_CIRCLE_GAP),
      ballAimDeg,
      ballMainEnd,
      ballLeftEnd: pointFrom(controls.ball, ballAimDeg - BALL_FAN, controls.ballRange),
      ballRightEnd: pointFrom(controls.ball, ballAimDeg + BALL_FAN, controls.ballRange),
      ballHandle: pointFrom(controls.ball, ballAimDeg, controls.ballRange + RANGE_HANDLE_OFFSET),
      ballFanPath: fanBandPath(controls.ball, ballAimDeg - BALL_FAN, ballAimDeg + BALL_FAN, controls.ballRange, FAN_CIRCLE_GAP),
      defAimDeg,
      defMainEnd,
      defLeftEnd: pointFrom(controls.defender, defAimDeg - DEF_FAN, controls.defRange),
      defRightEnd: pointFrom(controls.defender, defAimDeg + DEF_FAN, controls.defRange),
      defHandle: pointFrom(controls.defender, defAimDeg, controls.defRange + RANGE_HANDLE_OFFSET),
      defFanPath: fanBandPath(controls.defender, defAimDeg - DEF_FAN, defAimDeg + DEF_FAN, controls.defRange, FAN_CIRCLE_GAP),
      name,
      lineRisk,
      crossRisk,
      suggestion,
    };
  }, [controls]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const court = courtRef.current;
      if (!court) return;

      const rect = court.getBoundingClientRect();
      const pointer: Point = {
        x: (event.clientX - rect.left) * (VIEWBOX_WIDTH / rect.width),
        y: (event.clientY - rect.top) * (VIEWBOX_HEIGHT / rect.height),
      };

      setControls((current) => {
        if (dragging === 'ball') {
          return { ...current, ball: clampPoint(pointer, BALL_BOUNDS) };
        }

        if (dragging === 'defender') {
          return { ...current, defender: clampPoint(pointer, DEFENDER_BOUNDS) };
        }

        if (dragging === 'opponent') {
          return { ...current, opponent: clampPoint(pointer, OPPONENT_BOUNDS) };
        }

        if (dragging === 'hit') {
          return { ...current, hit: clampPoint(pointer, HIT_BOUNDS) };
        }

        if (dragging === 'attackRange') {
          return { ...current, attackRange: clamp(Math.round(distance(current.hit, pointer) - RANGE_HANDLE_OFFSET), 120, 1200) };
        }

        if (dragging === 'defenderRange') {
          return { ...current, defRange: clamp(Math.round(distance(current.defender, pointer) - RANGE_HANDLE_OFFSET), 120, 1200) };
        }

        if (dragging === 'opponentRange') {
          return { ...current, opponentRange: clamp(Math.round(distance(current.opponent, pointer) - RANGE_HANDLE_OFFSET), 120, 1200) };
        }

        if (dragging === 'ballRange') {
          return { ...current, ballRange: clamp(Math.round(distance(current.ball, pointer) - RANGE_HANDLE_OFFSET), 120, 1200) };
        }

        if (dragging === 'defenderFan') {
          const defBaseDeg = Math.atan2(current.hit.y - current.defender.y, current.hit.x - current.defender.x) * 180 / Math.PI;
          const currentDeg = Math.atan2(pointer.y - current.defender.y, pointer.x - current.defender.x) * 180 / Math.PI;
          return { ...current, defAngle: clamp(Math.round(normalizeAngle(currentDeg - defBaseDeg)), -80, 80) };
        }

        if (dragging === 'opponentFan') {
          const opponentBaseDeg = Math.atan2(current.defender.y - current.opponent.y, current.defender.x - current.opponent.x) * 180 / Math.PI;
          const currentDeg = Math.atan2(pointer.y - current.opponent.y, pointer.x - current.opponent.x) * 180 / Math.PI;
          return { ...current, opponentAngle: clamp(Math.round(normalizeAngle(currentDeg - opponentBaseDeg)), -80, 80) };
        }

        if (dragging === 'ballFan') {
          const ballBaseDeg = Math.atan2(current.hit.y - current.ball.y, current.hit.x - current.ball.x) * 180 / Math.PI;
          const currentDeg = Math.atan2(pointer.y - current.ball.y, pointer.x - current.ball.x) * 180 / Math.PI;
          return { ...current, ballAngle: clamp(Math.round(normalizeAngle(currentDeg - ballBaseDeg)), -80, 80) };
        }

        const baseDeg = Math.atan2(current.hit.y - current.ball.y, current.hit.x - current.ball.x) * 180 / Math.PI + 180;
        const currentDeg = Math.atan2(pointer.y - current.hit.y, pointer.x - current.hit.x) * 180 / Math.PI;
        return { ...current, angle: clamp(Math.round(normalizeAngle(currentDeg - baseDeg)), -55, 55) };
      });
    };

    const stopDragging = () => {
      setDragging(null);
      document.body.style.overflow = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [dragging]);

  function startDragging(target: DragTarget) {
    return (event: React.PointerEvent<SVGElement>) => {
      setDragging(target);
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.overflow = 'hidden';
      event.preventDefault();
    };
  }

  function setAngle(angle: number) {
    setControls((current) => ({ ...current, angle }));
  }

  function animateDemo() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }

    let value = -55;
    let direction = 1;
    timerRef.current = window.setInterval(() => {
      value += direction * 3;
      if (value >= 55 || value <= -55) direction *= -1;
      setControls((current) => ({ ...current, angle: value }));
    }, 60);

    window.setTimeout(() => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 5000);
  }

  return (
    <div className="wrap">
      <div className="panel">
        <div className="header">
          <SiteNav />
          {isTacticalPage && (
            <p>可透過拖曳直接調整對手拍子位置，並分析攻擊角度、直線威脅與對角威脅。</p>
          )}
          {isInventoryPage && (
            <p>選擇背包格中的物品，查看放大圖、推薦職業與商品細節。</p>
          )}
        </div>

        {!isTacticalPage && !isQuizPage && !isInventoryPage && <HomeBanner />}

        {isQuizPage && <QuizPage />}

        {isInventoryPage && <InventoryPage />}

        {isTacticalPage && (
          <div className="content">
          <div className="courtBox">
            <svg ref={courtRef} id="court" viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} style={{ touchAction: 'none' }}>
              <rect x="0" y="0" width="520" height="1024" fill="#6dbb6a" />
              <rect x="50" y="50" width="420" height="924" fill="none" stroke="white" strokeWidth="5" />
              <line x1="50" y1="512" x2="470" y2="512" stroke="#222" strokeWidth="6" />
              <line x1="50" y1="365" x2="470" y2="365" stroke="white" strokeWidth="4" />
              <line x1="50" y1="659" x2="470" y2="659" stroke="white" strokeWidth="4" />
              <line x1="260" y1="50" x2="260" y2="365" stroke="white" strokeWidth="4" />
              <line x1="260" y1="659" x2="260" y2="974" stroke="white" strokeWidth="4" />

              <text x="478" y="518" fontSize="18" fill="#222">Net</text>
              <text x="62" y="354" fontSize="16" fill="white">Kitchen Line</text>
              <text x="62" y="681" fontSize="16" fill="white">Kitchen Line</text>

              <path d={derived.opponentFanPath} fill="rgba(248,113,113,.18)" stroke="rgba(239,68,68,.38)" strokeWidth="2" className="svg-drag" onPointerDown={startDragging('opponentFan')} />
              <line {...svgLine(controls.opponent, derived.opponentLeftEnd)} stroke="#fecaca" strokeWidth="4" strokeDasharray="8 8" />
              <line {...svgLine(controls.opponent, derived.opponentMainEnd)} stroke="#f87171" strokeWidth="7" strokeLinecap="round" />
              <line {...svgLine(controls.opponent, derived.opponentRightEnd)} stroke="#fecaca" strokeWidth="4" strokeDasharray="8 8" />
              <circle cx={derived.opponentHandle.x} cy={derived.opponentHandle.y} r="18" fill="#ef4444" stroke="white" strokeWidth="3" className="svg-grab" onPointerDown={startDragging('opponentRange')} />

              <g className="svg-drag" transform={`translate(${controls.opponent.x - OPPONENT_HOME.x},${controls.opponent.y - OPPONENT_HOME.y})`} onPointerDown={startDragging('opponent')}>
                <rect x="40" y="58" width="150" height="112" fill="transparent" />
                <image href={assetPath('person_top_1.webp')} x="48" y="65" width="134" height="94" preserveAspectRatio="xMidYMid meet" />
                <circle cx="110" cy="120" r="10" fill="#ef4444" stroke="white" strokeWidth="3" />
                <text x="134" y="126" fontSize="17" fontWeight="800" fill="#ef4444" stroke="white" strokeWidth="3" paintOrder="stroke">對手A</text>
              </g>

              <path d={derived.fanPath} fill="rgba(167,227,109,.28)" stroke="rgba(122,201,67,.35)" strokeWidth="2" className="svg-drag" onPointerDown={startDragging('attackFan')} />

              <path d={derived.ballFanPath} fill="rgba(125,211,252,.22)" stroke="rgba(14,165,233,.42)" strokeWidth="2" className="svg-drag" onPointerDown={startDragging('ballFan')} />
              <line {...svgLine(controls.ball, derived.ballLeftEnd)} stroke="#bae6fd" strokeWidth="4" strokeDasharray="8 8" />
              <line {...svgLine(controls.ball, derived.ballMainEnd)} stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" />
              <line {...svgLine(controls.ball, derived.ballRightEnd)} stroke="#bae6fd" strokeWidth="4" strokeDasharray="8 8" />
              <circle cx={derived.ballHandle.x} cy={derived.ballHandle.y} r="18" fill="#0ea5e9" stroke="white" strokeWidth="3" className="svg-grab" onPointerDown={startDragging('ballRange')} />

              <g className="svg-drag" transform={`translate(${controls.ball.x - INCOMING_HOME.x},${controls.ball.y - INCOMING_HOME.y})`} onPointerDown={startDragging('ball')}>
                <rect x="72" y="832" width="154" height="150" fill="transparent" />
                <image href={assetPath('person_bottom_1.webp')} x="82" y="837" width="134" height="124" preserveAspectRatio="xMidYMid meet" />
                <circle cx="149" cy="909" r="10" fill="#2563eb" stroke="white" strokeWidth="3" />
                <text x="172" y="915" fontSize="17" fontWeight="800" fill="#2563eb" stroke="white" strokeWidth="3" paintOrder="stroke">防守B</text>
              </g>

              <line {...svgLine(controls.hit, derived.leftEnd)} stroke="#a7e36d" strokeWidth="4" strokeDasharray="8 8" />
              <line {...svgLine(controls.hit, derived.mainEnd)} stroke="#7ac943" strokeWidth="7" strokeLinecap="round" />
              <line {...svgLine(controls.hit, derived.rightEnd)} stroke="#a7e36d" strokeWidth="4" strokeDasharray="8 8" />
              <circle cx={derived.attackHandle.x} cy={derived.attackHandle.y} r="18" fill="#ef4444" stroke="white" strokeWidth="3" className="svg-grab" onPointerDown={startDragging('attackRange')} />

              <path d={derived.defFanPath} fill="rgba(147,197,253,.25)" stroke="rgba(96,165,250,.45)" strokeWidth="2" className="svg-drag" onPointerDown={startDragging('defenderFan')} />
              <line {...svgLine(controls.defender, derived.defLeftEnd)} stroke="#bfdbfe" strokeWidth="4" strokeDasharray="8 8" />
              <line {...svgLine(controls.defender, derived.defMainEnd)} stroke="#60a5fa" strokeWidth="7" strokeLinecap="round" />
              <line {...svgLine(controls.defender, derived.defRightEnd)} stroke="#bfdbfe" strokeWidth="4" strokeDasharray="8 8" />
              <circle cx={derived.defHandle.x} cy={derived.defHandle.y} r="18" fill="#60a5fa" stroke="white" strokeWidth="3" className="svg-grab" onPointerDown={startDragging('defenderRange')} />

              <g className="svg-drag" transform={`translate(${controls.defender.x - DEFENDER_HOME.x},${controls.defender.y - DEFENDER_HOME.y})`} onPointerDown={startDragging('defender')}>
                <rect x="183" y="719" width="154" height="150" fill="transparent" />
                <image href={assetPath('person_bottom_2.webp')} x="189" y="732" width="142" height="109" preserveAspectRatio="xMidYMid meet" />
                <circle cx="260" cy="796" r="10" fill="#2563eb" stroke="white" strokeWidth="3" />
                <text x="283" y="802" fontSize="17" fontWeight="800" fill="#2563eb" stroke="white" strokeWidth="3" paintOrder="stroke">防守A</text>
              </g>

              <g className="svg-drag" transform={`translate(${controls.hit.x},${controls.hit.y})`} onPointerDown={startDragging('hit')}>
                <rect x="-86" y="-82" width="166" height="126" fill="transparent" />
                <image href={assetPath('person_top_2.webp')} x="-78" y="-78" width="140" height="98" preserveAspectRatio="xMidYMid meet" />
                <circle r="10" fill="#ef4444" stroke="white" strokeWidth="3" />
                <text x="22" y="-8" fontSize="18" fontWeight="700" fill="#ef4444" stroke="white" strokeWidth="3" paintOrder="stroke">對手B</text>
              </g>
              <text x="332" y="400" fontSize="20" fontWeight="900" fill="#F9ECE5">{derived.name}</text>
            </svg>
          </div>

          <aside className="side">
            <div className="group">
              <RangeField label="拍面角度" value={controls.angle} min={-55} max={55} suffix="°" onChange={(angle) => setControls((current) => ({ ...current, angle }))} />
              <RangeField label="攻擊範圍長度" value={controls.attackRange} min={160} max={1200} onChange={(attackRange) => setControls((current) => ({ ...current, attackRange }))} />
              <div className="btns">
                <button type="button" onClick={() => setAngle(-35)}>偏右回擊</button>
                <button type="button" onClick={() => setAngle(0)}>正面回擊</button>
                <button type="button" onClick={() => setAngle(35)}>偏左回擊</button>
                <button type="button" className="secondary" onClick={animateDemo}>自動示範</button>
              </div>
            </div>

            <div className="group">
              <RangeField label="對手拍子 X 軸" value={controls.hit.x} min={65} max={455} onChange={(x) => setControls((current) => ({ ...current, hit: { ...current.hit, x } }))} />
              <RangeField label="對手拍子 Y 軸" value={controls.hit.y} min={70} max={502} onChange={(y) => setControls((current) => ({ ...current, hit: { ...current.hit, y } }))} />
              <RangeField label="對手A攻擊角度" value={controls.opponentAngle} min={-80} max={80} suffix="°" onChange={(opponentAngle) => setControls((current) => ({ ...current, opponentAngle }))} />
              <RangeField label="對手A攻擊範圍長度" value={controls.opponentRange} min={120} max={1200} onChange={(opponentRange) => setControls((current) => ({ ...current, opponentRange }))} />
            </div>

            <div className="group">
              <RangeField label="防守B站位 X 軸" value={controls.ball.x} min={65} max={455} onChange={(x) => setControls((current) => ({ ...current, ball: { ...current.ball, x } }))} />
              <RangeField label="防守B站位 Y 軸" value={controls.ball.y} min={532} max={954} onChange={(y) => setControls((current) => ({ ...current, ball: { ...current.ball, y } }))} />
              <RangeField label="防守B角度" value={controls.ballAngle} min={-80} max={80} suffix="°" onChange={(ballAngle) => setControls((current) => ({ ...current, ballAngle }))} />
              <RangeField label="防守B範圍長度" value={controls.ballRange} min={120} max={1200} onChange={(ballRange) => setControls((current) => ({ ...current, ballRange }))} />
              <RangeField label="防守A站位 X 軸" value={controls.defender.x} min={65} max={455} onChange={(x) => setControls((current) => ({ ...current, defender: { ...current.defender, x } }))} />
              <RangeField label="防守A站位 Y 軸" value={controls.defender.y} min={532} max={954} onChange={(y) => setControls((current) => ({ ...current, defender: { ...current.defender, y } }))} />
              <RangeField label="防守A角度" value={controls.defAngle} min={-80} max={80} suffix="°" onChange={(defAngle) => setControls((current) => ({ ...current, defAngle }))} />
              <RangeField label="防守A範圍長度" value={controls.defRange} min={120} max={1200} onChange={(defRange) => setControls((current) => ({ ...current, defRange }))} />
            </div>

            <div className="group">
              <div className="legend">
                <div className="item"><span className="dot" style={{ background: '#111827' }} />發球方向</div>
                <div className="item"><span className="dot" style={{ background: '#7ac943' }} />主要可能攻擊路徑</div>
                <div className="item"><span className="dot" style={{ background: '#a7e36d' }} />可攻擊範圍</div>
                <div className="item"><span className="dot" style={{ background: '#2563eb' }} />防守站位</div>
                <div className="item"><span className="dot" style={{ background: '#60a5fa' }} />防守覆蓋範圍</div>
                <div className="item"><span className="dot" style={{ background: '#ef4444' }} />對手</div>
              </div>
            </div>

            <div className="group analysis">
              <div className="card">
                <strong>攻擊型態</strong>
                <span>{derived.name}</span>
              </div>
              <div className="card">
                <strong>左側威脅</strong>
                <span className="risk">{derived.lineRisk}%</span>
              </div>
              <div className="card">
                <strong>右側威脅</strong>
                <span className="risk">{derived.crossRisk}%</span>
              </div>
              <div className="card">
                <strong>站位建議</strong>
                <span>{derived.suggestion}</span>
              </div>
            </div>

            <div className="note">
              說明：這是視覺化戰術判斷工具，主要用於理解拍面角度、擊球點位置與防守站位之間的關係。
            </div>
            <a href="https://shopee.tw/product/1345340496/50554287939" target="_blank" rel="noreferrer">
              小工商【JINHOPA】高階匹克球拍｜摩擦回饋｜緩衝核心｜輕量化
            </a>
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}

export default App;
