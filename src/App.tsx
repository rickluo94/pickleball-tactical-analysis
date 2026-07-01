import { useEffect, useMemo, useRef, useState } from 'react';

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
      <h1 className="site-nav-title">Pickle Today 冒險的起點！</h1>
      <div className="site-nav-links">
        <a className="site-nav-link" href="tactical-analysis.html">戰術分析工具</a>
        <a className="site-nav-link" href="tips.html">Tips小技巧</a>
        <a className="site-nav-link" href="pickleball-mixer.html">守擂賽</a>
        <a className="site-nav-link" href="friendly-schedule.html">友誼賽程</a>
        <a className="site-nav-link" href="course.html">技能修練</a>
      </div>
    </nav>
  );
}

function HomeBanner() {
  return (
    <picture className="home-banner">
      <source media="(max-width: 640px)" srcSet={assetPath('banner_phone.jpeg')} />
      <img src={assetPath('banner_web.jpeg')} alt="Pickle Today" />
    </picture>
  );
}

function App() {
  const [controls, setControls] = useState<Controls>(initialControls);
  const [dragging, setDragging] = useState<DragTarget | null>(null);
  const timerRef = useRef<number | null>(null);
  const courtRef = useRef<SVGSVGElement | null>(null);
  const isTacticalPage = window.location.pathname.endsWith('/tactical-analysis.html');

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
        </div>

        {!isTacticalPage && <HomeBanner />}

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
                <image href={assetPath('person_top_1.png')} x="48" y="65" width="134" height="94" preserveAspectRatio="xMidYMid meet" />
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
                <image href={assetPath('person_bottom_1.png')} x="82" y="837" width="134" height="124" preserveAspectRatio="xMidYMid meet" />
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
                <image href={assetPath('person_bottom_2.png')} x="189" y="732" width="142" height="109" preserveAspectRatio="xMidYMid meet" />
                <circle cx="260" cy="796" r="10" fill="#2563eb" stroke="white" strokeWidth="3" />
                <text x="283" y="802" fontSize="17" fontWeight="800" fill="#2563eb" stroke="white" strokeWidth="3" paintOrder="stroke">防守A</text>
              </g>

              <g className="svg-drag" transform={`translate(${controls.hit.x},${controls.hit.y})`} onPointerDown={startDragging('hit')}>
                <rect x="-86" y="-82" width="166" height="126" fill="transparent" />
                <image href={assetPath('person_top_2.png')} x="-78" y="-78" width="140" height="98" preserveAspectRatio="xMidYMid meet" />
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
