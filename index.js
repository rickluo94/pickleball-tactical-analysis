const angleInput = document.getElementById('angle');
const hitXInput = document.getElementById('hitX');
const hitYInput = document.getElementById('hitY');
const defXInput = document.getElementById('defX');
const defYInput=document.getElementById('defY');
const ballXInput=document.getElementById('ballX');
const ballYInput=document.getElementById('ballY');

const angleText = document.getElementById('angleText');
const xText = document.getElementById('xText');
const yText = document.getElementById('yText');
const defXText = document.getElementById('defXText');
const defYText=document.getElementById('defYText');
const ballXText=document.getElementById('ballXText');
const ballYText=document.getElementById('ballYText');

const hitPoint = document.getElementById('hitPoint');
const paddle = document.getElementById('paddle');
const defender = document.getElementById('defender');

const incoming = document.getElementById('incoming');
const incomingDot = document.getElementById('incomingDot');
const incomingText = document.getElementById('incomingText');
const mainRay = document.getElementById('mainRay');
const leftRay = document.getElementById('leftRay');
const rightRay = document.getElementById('rightRay');
const fanArea = document.getElementById('fanArea');
const routeText = document.getElementById('routeText');

const routeNameEl = document.getElementById('routeName');
const lineRiskEl = document.getElementById('lineRisk');
const crossRiskEl = document.getElementById('crossRisk');
const suggestionEl = document.getElementById('suggestion');

let incomingStart = {x:260,y:570};
const rayLength = 600;
const fan = 20;

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

function routeName(angle){
    if(angle > 30) return '偏直線攻擊';
    if(angle < -30) return '大角度對角攻擊';
    if(angle > 10) return '中線偏直線';
    if(angle < -10) return '中線偏對角';
    return '中間壓迫';
}

function pct(n){
    return Math.max(0, Math.min(100, Math.round(n)));
}

function update(){
    const angle = Number(angleInput.value);
    const hit = { x:Number(hitXInput.value), y:Number(hitYInput.value) };
    const def = { x:Number(defXInput.value), y:Number(defYInput.value) };

    angleText.textContent = angle;
    xText.textContent = hit.x;
    yText.textContent = hit.y;
    defXText.textContent = def.x;
    defYText.textContent=def.y;
    incomingStart={x:Number(ballXInput.value),y:Number(ballYInput.value)};
    ballXText.textContent=incomingStart.x;
    ballYText.textContent=incomingStart.y;

    hitPoint.setAttribute('transform', `translate(${hit.x},${hit.y})`);
    // 拍子已在 hitPoint 內，僅需處理旋轉
    paddle.setAttribute('transform', `rotate(${angle})`);
    defender.setAttribute('transform', `translate(${def.x - 450},${def.y - 500})`);

    setLine(incoming, incomingStart, hit);

    incomingDot.setAttribute('cx', incomingStart.x);
    incomingDot.setAttribute('cy', incomingStart.y);
    incomingText.setAttribute('x', incomingStart.x + 15);
    incomingText.setAttribute('y', incomingStart.y - 25);

    const baseDeg = Math.atan2(hit.y - incomingStart.y, hit.x - incomingStart.x) * 180 / Math.PI + 180;
    const shotDeg = baseDeg + angle;

    const mainEnd = pointFrom(hit, shotDeg, rayLength);
    const leftEnd = pointFrom(hit, shotDeg - fan, rayLength);
    const rightEnd = pointFrom(hit, shotDeg + fan, rayLength);

    setLine(mainRay, hit, mainEnd);
    setLine(leftRay, hit, leftEnd);
    setLine(rightRay, hit, rightEnd);

    fanArea.setAttribute('d', `M ${hit.x} ${hit.y} L ${leftEnd.x} ${leftEnd.y} A ${rayLength} ${rayLength} 0 0 1 ${rightEnd.x} ${rightEnd.y} Z`);

    const name = routeName(angle);
    routeText.textContent = name;
    routeNameEl.textContent = name;

    const courtCenter = 450;
    const attackSide = hit.x > courtCenter ? 1 : -1;
    const defenderBias = (def.x - courtCenter) * attackSide;

    const lineRisk = pct(55 + angle * .75 + (hit.x - 450) * .05 - defenderBias * .08);
    const crossRisk = pct(55 - angle * .75 + Math.abs(hit.x - 450) * .04 + defenderBias * .04);

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

[angleInput, hitXInput, hitYInput, ballXInput, ballYInput, defXInput, defYInput].forEach(el => {
    el.addEventListener('input', update);
});

// 拖曳扇形調整角度邏輯
let isDragging = false;
let isDraggingBall = false;
let isDraggingDefender = false;
let isDraggingHit = false;
const courtSvg = document.getElementById('court');

fanArea.addEventListener('pointerdown', (e) => {
    isDragging = true;
    // 鎖定指標，確保離開扇形範圍也能繼續追蹤
    fanArea.setPointerCapture(e.pointerId);
    // 調整戰術板時停止頁面滾動
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

incomingDot.addEventListener('pointerdown', (e) => {
    isDraggingBall = true;
    incomingDot.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

defender.addEventListener('pointerdown', (e) => {
    isDraggingDefender = true;
    defender.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

hitPoint.addEventListener('pointerdown', (e) => {
    isDraggingHit = true;
    hitPoint.setPointerCapture(e.pointerId);
    document.body.style.overflow = 'hidden';
    e.preventDefault();
});

window.addEventListener('pointermove', (e) => {
    if (!isDragging && !isDraggingBall && !isDraggingDefender && !isDraggingHit) return;

    // 1. 取得 SVG 座標轉換比例
    const rect = courtSvg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (900 / rect.width);
    const svgY = (e.clientY - rect.top) * (650 / rect.height);

    // 2. 取得目前的擊球點與來球起點
    const hit = { x: Number(hitXInput.value), y: Number(hitYInput.value) };
    const ball = { x: Number(ballXInput.value), y: Number(ballYInput.value) };

    if (isDraggingBall) {
        // 處理球的位置拖曳，並限制在 Input 的範圍內
        ballXInput.value = Math.max(110, Math.min(790, Math.round(svgX)));
        ballYInput.value = Math.max(340, Math.min(610, Math.round(svgY)));
        update();
        return;
    }

    if (isDraggingDefender) {
        // 處理防守者位置拖曳，限制在防守區範圍內 (與 Input 設定一致)
        defXInput.value = Math.max(110, Math.min(790, Math.round(svgX)));
        defYInput.value = Math.max(430, Math.min(600, Math.round(svgY)));
        update();
        return;
    }

    if (isDraggingHit) {
        // 處理擊球點位置拖曳，限制在對手半場範圍內 (與 Input 設定一致)
        hitXInput.value = Math.max(110, Math.min(790, Math.round(svgX)));
        hitYInput.value = Math.max(55, Math.min(315, Math.round(svgY)));
        update();
        return;
    }

    // 3. 計算基準角 (與 update 函式邏輯一致)
    const baseDeg = Math.atan2(hit.y - ball.y, hit.x - ball.x) * 180 / Math.PI + 180;

    // 4. 計算目前指標相對於擊球點的角度
    const currentDeg = Math.atan2(svgY - hit.y, svgX - hit.x) * 180 / Math.PI;

    // 5. 計算相對角度差 (angle)
    let diff = currentDeg - baseDeg;

    // 標準化角度至 -180 ~ 180
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;

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
    } else if (isDraggingBall) {
        isDraggingBall = false;
        incomingDot.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingDefender) {
        isDraggingDefender = false;
        defender.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    } else if (isDraggingHit) {
        isDraggingHit = false;
        hitPoint.releasePointerCapture(e.pointerId);
        document.body.style.overflow = '';
    }
});

window.addEventListener('pointercancel', (e) => {
    if (isDragging || isDraggingBall || isDraggingDefender || isDraggingHit) {
        isDragging = false;
        isDraggingBall = false;
        isDraggingDefender = false;
        isDraggingHit = false;
        document.body.style.overflow = '';
    }
});

update();