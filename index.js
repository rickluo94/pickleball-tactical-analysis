const angleInput = document.getElementById('angle');
const hitXInput = document.getElementById('hitX');
const hitYInput = document.getElementById('hitY');
const defXInput = document.getElementById('defX');
const defYInput=document.getElementById('defY');
const ballXInput=document.getElementById('ballX');
const ballYInput=document.getElementById('ballY');
const defAngleInput = document.getElementById('defAngle');
const attackRangeInput = document.getElementById('attackRange');
const defRangeInput = document.getElementById('defRange');

const angleText = document.getElementById('angleText');
const xText = document.getElementById('xText');
const yText = document.getElementById('yText');
const defXText = document.getElementById('defXText');
const defYText=document.getElementById('defYText');
const ballXText=document.getElementById('ballXText');
const ballYText=document.getElementById('ballYText');
const defAngleText = document.getElementById('defAngleText');
const attackRangeText = document.getElementById('attackRangeText');
const defRangeText = document.getElementById('defRangeText');

const hitPoint = document.getElementById('hitPoint');
// const paddle = document.getElementById('paddle');
const defender = document.getElementById('defender');
const opponentEl = document.getElementById('opponent');

const incomingDot = document.getElementById('incomingDot');
const mainRay = document.getElementById('mainRay');
const leftRay = document.getElementById('leftRay');
const rightRay = document.getElementById('rightRay');
const fanArea = document.getElementById('fanArea');
const attackRangeHandle = document.getElementById('attackRangeHandle');
const defFanArea = document.getElementById('defFanArea');
const defMainRay = document.getElementById('defMainRay');
const defLeftRay = document.getElementById('defLeftRay');
const defRightRay = document.getElementById('defRightRay');
const defRangeHandle = document.getElementById('defRangeHandle');
const routeText = document.getElementById('routeText');

const routeNameEl = document.getElementById('routeName');
const lineRiskEl = document.getElementById('lineRisk');
const crossRiskEl = document.getElementById('crossRisk');
const suggestionEl = document.getElementById('suggestion');

const VIEWBOX_WIDTH = 520;
const VIEWBOX_HEIGHT = 1024;
const COURT_CENTER_X = 260;
const DEFENDER_HOME = {x:260,y:796};
const OPPONENT_HOME = {x:110,y:120};
const INCOMING_HOME = {x:149,y:909};
const HIT_BOUNDS = {minX:65,maxX:455,minY:70,maxY:502};
const BALL_BOUNDS = {minX:65,maxX:455,minY:532,maxY:954};
const DEFENDER_BOUNDS = {minX:65,maxX:455,minY:532,maxY:954};
const OPPONENT_BOUNDS = {minX:65,maxX:455,minY:70,maxY:502};
const ATTACK_RANGE_BOUNDS = {min:120,max:1200};
const DEF_RANGE_BOUNDS = {min:120,max:1200};
const RANGE_HANDLE_OFFSET = 28;
const FAN_CIRCLE_GAP = 34;

let incomingStart = {x:149,y:909};
let opponent = {...OPPONENT_HOME};
const fan = 20;
const defFan = 20;
const defAngleLimit = 80;

function clamp(n, min, max){
    return Math.max(min, Math.min(max, n));
}

function pointFrom(origin, deg, len){
    const rad = deg * Math.PI / 180;
    return {
        x: origin.x + Math.cos(rad) * len,
        y: origin.y + Math.sin(rad) * len
    };
}

function setLine(line, a, b){
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
}

function bringToFront(el){
    if (el.parentNode) {
        el.parentNode.appendChild(el);
    }
}

function fanBandPath(origin, leftDeg, rightDeg, outerRadius, innerRadius){
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
        'Z'
    ].join(' ');
}

function distance(a, b){
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function routeName(angle){
    if(angle > 30) return '大角度對角攻擊';
    if(angle < -30) return '大角度對角攻擊';
    if(angle > 10) return '中線偏左';
    if(angle < -10) return '中線偏右';
    return '正面回擊';
}

function pct(n){
    return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeAngle(deg){
    let normalized = deg;
    while (normalized > 180) normalized -= 360;
    while (normalized < -180) normalized += 360;
    return normalized;
}

function update(){
    const angle = Number(angleInput.value);
    const defAngle = Number(defAngleInput.value);
    const rayLength = Number(attackRangeInput.value);
    const defRayLength = Number(defRangeInput.value);
    const hit = { x:Number(hitXInput.value), y:Number(hitYInput.value) };
    const def = { x:Number(defXInput.value), y:Number(defYInput.value) };

    angleText.textContent = angle;
    defAngleText.textContent = defAngle;
    attackRangeText.textContent = rayLength;
    defRangeText.textContent = defRayLength;
    xText.textContent = hit.x;
    yText.textContent = hit.y;
    defXText.textContent = def.x;
    defYText.textContent=def.y;
    incomingStart={x:Number(ballXInput.value),y:Number(ballYInput.value)};
    ballXText.textContent=incomingStart.x;
    ballYText.textContent=incomingStart.y;

    hitPoint.setAttribute('transform', `translate(${hit.x},${hit.y})`);
    // 拍子已在 hitPoint 內，僅需處理旋轉
    // paddle.setAttribute('transform', `rotate(${angle})`);
    defender.setAttribute('transform', `translate(${def.x - DEFENDER_HOME.x},${def.y - DEFENDER_HOME.y})`);
    opponentEl.setAttribute('transform', `translate(${opponent.x - OPPONENT_HOME.x},${opponent.y - OPPONENT_HOME.y})`);
    incomingDot.setAttribute('transform', `translate(${incomingStart.x - INCOMING_HOME.x},${incomingStart.y - INCOMING_HOME.y})`);

    const baseDeg = Math.atan2(hit.y - incomingStart.y, hit.x - incomingStart.x) * 180 / Math.PI + 180;
    const shotDeg = baseDeg + angle;

    const mainEnd = pointFrom(hit, shotDeg, rayLength);
    const leftEnd = pointFrom(hit, shotDeg - fan, rayLength);
    const rightEnd = pointFrom(hit, shotDeg + fan, rayLength);

    setLine(mainRay, hit, mainEnd);
    setLine(leftRay, hit, leftEnd);
    setLine(rightRay, hit, rightEnd);
    const attackHandlePoint = pointFrom(hit, shotDeg, rayLength + RANGE_HANDLE_OFFSET);
    attackRangeHandle.setAttribute('cx', attackHandlePoint.x);
    attackRangeHandle.setAttribute('cy', attackHandlePoint.y);

    fanArea.setAttribute('d', fanBandPath(hit, shotDeg - fan, shotDeg + fan, rayLength, FAN_CIRCLE_GAP));

    const defBaseDeg = Math.atan2(hit.y - def.y, hit.x - def.x) * 180 / Math.PI;
    const defAimDeg = defBaseDeg + defAngle;
    const defMainEnd = pointFrom(def, defAimDeg, defRayLength);
    const defLeftEnd = pointFrom(def, defAimDeg - defFan, defRayLength);
    const defRightEnd = pointFrom(def, defAimDeg + defFan, defRayLength);

    setLine(defMainRay, def, defMainEnd);
    setLine(defLeftRay, def, defLeftEnd);
    setLine(defRightRay, def, defRightEnd);
    const defHandlePoint = pointFrom(def, defAimDeg, defRayLength + RANGE_HANDLE_OFFSET);
    defRangeHandle.setAttribute('cx', defHandlePoint.x);
    defRangeHandle.setAttribute('cy', defHandlePoint.y);
    defFanArea.setAttribute('d', fanBandPath(def, defAimDeg - defFan, defAimDeg + defFan, defRayLength, FAN_CIRCLE_GAP));

    const name = routeName(angle);
    routeText.textContent = name;
    routeNameEl.textContent = name;

    const attackSide = hit.x > COURT_CENTER_X ? 1 : -1;
    const defenderBias = (def.x - COURT_CENTER_X) * attackSide;

    const lineRisk = pct(55 + angle * .75 + (hit.x - COURT_CENTER_X) * .08 - defenderBias * .12);
    const crossRisk = pct(55 - angle * .75 + Math.abs(hit.x - COURT_CENTER_X) * .07 + defenderBias * .06);

    lineRiskEl.textContent = lineRisk + '%';
    crossRiskEl.textContent = crossRisk + '%';

    if(lineRisk > crossRisk + 15){
        suggestionEl.textContent = '直線空間較大，防守者可往對手所在側微移。';
    }else if(crossRisk > lineRisk + 15){
        suggestionEl.textContent = '對角角度較大，防守者需注意斜線穿越。';
    }else{
        suggestionEl.textContent = '目前直線與對角威脅接近，建議守中間偏對手拍面方向。';
    }
}

function setAngle(v){
    angleInput.value = v;
    update();
}

let timer = null;
function animateDemo(){
    if(timer) clearInterval(timer);
    let v = -55;
    let dir = 1;
    timer = setInterval(() => {
        v += dir * 3;
        if(v >= 55 || v <= -55) dir *= -1;
        angleInput.value = v;
        update();
    }, 60);
    setTimeout(() => clearInterval(timer), 5000);
}

[angleInput, hitXInput, hitYInput, ballXInput, ballYInput, defXInput, defYInput, defAngleInput, attackRangeInput, defRangeInput].forEach(el => {
    el.addEventListener('input', update);
});

// 拖曳扇形調整角度邏輯
let isDragging = false;
let isDraggingBall = false;
let isDraggingDefender = false;
let isDraggingHit = false;
let isDraggingDefFan = false;
let isDraggingAttackRange = false;
let isDraggingDefRange = false;
let isDraggingOpponent = false;
const courtSvg = document.getElementById('court');

fanArea.addEventListener('pointerdown', (e) => {
    isDragging = true;
    bringToFront(fanArea);
    // 鎖定指標，確保離開扇形範圍也能繼續追蹤
    fanArea.setPointerCapture(e.pointerId);
    // 調整戰術板時停止頁面滾動
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

attackRangeHandle.addEventListener('pointerdown', (e) => {
    isDraggingAttackRange = true;
    bringToFront(attackRangeHandle);
    attackRangeHandle.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

defFanArea.addEventListener('pointerdown', (e) => {
    isDraggingDefFan = true;
    bringToFront(defFanArea);
    defFanArea.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

defRangeHandle.addEventListener('pointerdown', (e) => {
    isDraggingDefRange = true;
    bringToFront(defRangeHandle);
    defRangeHandle.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

incomingDot.addEventListener('pointerdown', (e) => {
    isDraggingBall = true;
    bringToFront(incomingDot);
    incomingDot.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

defender.addEventListener('pointerdown', (e) => {
    isDraggingDefender = true;
    bringToFront(defender);
    defender.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

opponentEl.addEventListener('pointerdown', (e) => {
    isDraggingOpponent = true;
    bringToFront(opponentEl);
    opponentEl.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

hitPoint.addEventListener('pointerdown', (e) => {
    isDraggingHit = true;
    bringToFront(hitPoint);
    hitPoint.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging && !isDraggingBall && !isDraggingDefender && !isDraggingHit && !isDraggingDefFan && !isDraggingAttackRange && !isDraggingDefRange && !isDraggingOpponent) return;

    // 1. 取得 SVG 座標轉換比例
    const rect = courtSvg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (VIEWBOX_WIDTH / rect.width);
    const svgY = (e.clientY - rect.top) * (VIEWBOX_HEIGHT / rect.height);

    // 2. 取得目前的擊球點與來球起點
    const hit = { x: Number(hitXInput.value), y: Number(hitYInput.value) };
    const ball = { x: Number(ballXInput.value), y: Number(ballYInput.value) };
    const def = { x: Number(defXInput.value), y: Number(defYInput.value) };
    const pointer = {x:svgX,y:svgY};

    if (isDraggingBall) {
        // 處理球的位置拖曳，並限制在 Input 的範圍內
        ballXInput.value = clamp(Math.round(svgX), BALL_BOUNDS.minX, BALL_BOUNDS.maxX);
        ballYInput.value = clamp(Math.round(svgY), BALL_BOUNDS.minY, BALL_BOUNDS.maxY);
        update();
        return;
    }

    if (isDraggingDefender) {
        // 處理防守者位置拖曳，限制在防守區範圍內 (與 Input 設定一致)
        defXInput.value = clamp(Math.round(svgX), DEFENDER_BOUNDS.minX, DEFENDER_BOUNDS.maxX);
        defYInput.value = clamp(Math.round(svgY), DEFENDER_BOUNDS.minY, DEFENDER_BOUNDS.maxY);
        update();
        return;
    }

    if (isDraggingOpponent) {
        opponent = {
            x: clamp(Math.round(svgX), OPPONENT_BOUNDS.minX, OPPONENT_BOUNDS.maxX),
            y: clamp(Math.round(svgY), OPPONENT_BOUNDS.minY, OPPONENT_BOUNDS.maxY)
        };
        update();
        return;
    }

    if (isDraggingHit) {
        // 處理擊球點位置拖曳，限制在對手半場範圍內 (與 Input 設定一致)
        hitXInput.value = clamp(Math.round(svgX), HIT_BOUNDS.minX, HIT_BOUNDS.maxX);
        hitYInput.value = clamp(Math.round(svgY), HIT_BOUNDS.minY, HIT_BOUNDS.maxY);
        update();
        return;
    }

    if (isDraggingAttackRange) {
        attackRangeInput.value = clamp(Math.round(distance(hit, pointer) - RANGE_HANDLE_OFFSET), ATTACK_RANGE_BOUNDS.min, ATTACK_RANGE_BOUNDS.max);
        update();
        return;
    }

    if (isDraggingDefRange) {
        defRangeInput.value = clamp(Math.round(distance(def, pointer) - RANGE_HANDLE_OFFSET), DEF_RANGE_BOUNDS.min, DEF_RANGE_BOUNDS.max);
        update();
        return;
    }

    if (isDraggingDefFan) {
        const defBaseDeg = Math.atan2(hit.y - def.y, hit.x - def.x) * 180 / Math.PI;
        const currentDeg = Math.atan2(svgY - def.y, svgX - def.x) * 180 / Math.PI;
        const finalAngle = clamp(Math.round(normalizeAngle(currentDeg - defBaseDeg)), -defAngleLimit, defAngleLimit);
        defAngleInput.value = finalAngle;
        update();
        return;
    }

    // 3. 計算基準角 (與 update 函式邏輯一致)
    const baseDeg = Math.atan2(hit.y - ball.y, hit.x - ball.x) * 180 / Math.PI + 180;

    // 4. 計算目前指標相對於擊球點的角度
    const currentDeg = Math.atan2(svgY - hit.y, svgX - hit.x) * 180 / Math.PI;

    // 5. 計算相對角度差 (angle)
    const diff = normalizeAngle(currentDeg - baseDeg);

    // 限制範圍並更新
    const finalAngle = Math.max(-55, Math.min(55, Math.round(diff)));
    angleInput.value = finalAngle;

    update();
});

window.addEventListener('pointerup', (e) => {
    if (isDragging) {
        isDragging = false;
        fanArea.releasePointerCapture(e.pointerId);
        // 恢復頁面滾動
        document.body.style.overflow = '';
    } else if (isDraggingAttackRange) {
        isDraggingAttackRange = false;
        attackRangeHandle.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingDefFan) {
        isDraggingDefFan = false;
        defFanArea.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingDefRange) {
        isDraggingDefRange = false;
        defRangeHandle.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingBall) {
        isDraggingBall = false;
        incomingDot.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingDefender) {
        isDraggingDefender = false;
        defender.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingOpponent) {
        isDraggingOpponent = false;
        opponentEl.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingHit) {
        isDraggingHit = false;
        hitPoint.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    }
});

window.addEventListener('pointercancel', (e) => {
    if (isDragging || isDraggingBall || isDraggingDefender || isDraggingHit || isDraggingDefFan || isDraggingAttackRange || isDraggingDefRange || isDraggingOpponent) {
        isDragging = false;
        isDraggingBall = false;
        isDraggingDefender = false;
        isDraggingHit = false;
        isDraggingDefFan = false;
        isDraggingAttackRange = false;
        isDraggingDefRange = false;
        isDraggingOpponent = false;
        document.body.style.overflow = '';
    }
});

update();
