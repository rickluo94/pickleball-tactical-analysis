import { useEffect, useMemo, useState } from 'react';
import './PickleballMixerPage.css';

type Player = {
  name: string;
  played: number;
  wins: number;
  waiting: number;
  partners: Set<string>;
};

type Side = 'A' | 'B';

type MatchRecord = {
  no: number;
  a: string[];
  b: string[];
  score: string;
  winner: Side;
};

type TutorialStep = {
  title: string;
  text: string;
  selector: string;
};

type MixerSnapshot = {
  savedAt: string;
  nameInput: string;
  players: Array<Omit<Player, 'partners'> & { partners: string[] }>;
  queue: string[];
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  streakA: number;
  streakB: number;
  matchNo: number;
  history: MatchRecord[];
  bannedPairs: string[];
  winningScore: number;
};

const defaultNames = `1.A1
2.A2
3.A3
4.A4
5.A5
6.A6
7.A7
8.A8
9.A9
10.A10
11.A11
12.A12
13.A13
14.A14`;

const tutorialStorageKey = 'pickleball-mixer-tutorial-seen';
const currentStateStorageKey = 'pickleball-mixer-current-state-v1';
const resetSnapshotStorageKey = 'pickleball-mixer-reset-snapshot-v1';
const resetArchiveStorageKey = 'pickleball-mixer-reset-archive-v1';

const tutorialSteps: TutorialStep[] = [
  {
    title: '先貼上人員名單',
    text: '在左側名單欄位依照「1.姓名」格式貼上所有參賽者，系統會自動整理成排場名單。',
    selector: '#nameInput',
  },
  {
    title: '載入名單',
    text: '點擊「載入名單」後，等待區與出場統計會重置，名單會正式進入排場系統。',
    selector: '#loadPlayersButton',
  },
  {
    title: '開始排場',
    text: '點擊「開始排場」會自動安排第一場。若要重新開始，旁邊的「重置」會清掉目前狀態。',
    selector: '#autoStartButton, #resetAllButton',
  },
  {
    title: '記錄比分或直接判勝',
    text: '比賽中可以按比分加減。到達勝分會自動判勝，也可以直接點隊伍卡片左上角的勝。',
    selector: '.score-control, .winner-button',
  },
  {
    title: '補上下一場對手',
    text: '一場結束後，勝隊會留場。點擊「補上下一場對手」才會從等待區補新的挑戰隊。',
    selector: '#nextMatchButton',
  },
  {
    title: '視情況洗牌等待區',
    text: '如果想調整等待順序，可以使用「等待區洗牌」。這是選用功能，不影響基本排場流程。',
    selector: '#shuffleQueueButton',
  },
];

function parseNames(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\s*[.、)]\s*/, '').trim())
    .filter(Boolean);
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('＋');
}

function createPlayers(names: string[]): Player[] {
  return names.map((name) => ({
    name,
    played: 0,
    wins: 0,
    waiting: 0,
    partners: new Set<string>(),
  }));
}

function clonePlayers(players: Player[]) {
  return players.map((player) => ({
    ...player,
    partners: new Set(player.partners),
  }));
}

function formatTeam(team: string[]) {
  return team.length ? team.join(' ＋ ') : '等待排定';
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function serializePlayers(players: Player[]): MixerSnapshot['players'] {
  return players.map((player) => ({
    ...player,
    partners: Array.from(player.partners),
  }));
}

function restorePlayers(snapshotPlayers: MixerSnapshot['players']) {
  return snapshotPlayers.map((player) => ({
    ...player,
    partners: new Set(toStringArray(player.partners)),
  }));
}

function readStoredSnapshot(): MixerSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(currentStateStorageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MixerSnapshot>;
    if (!Array.isArray(parsed.players)) return null;

    const winningScore =
      typeof parsed.winningScore === 'number' && Number.isFinite(parsed.winningScore) && parsed.winningScore >= 1
        ? Math.min(Math.round(parsed.winningScore), 99)
        : 15;

    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      nameInput: typeof parsed.nameInput === 'string' ? parsed.nameInput : defaultNames,
      players: parsed.players,
      queue: toStringArray(parsed.queue),
      teamA: toStringArray(parsed.teamA),
      teamB: toStringArray(parsed.teamB),
      scoreA: typeof parsed.scoreA === 'number' ? parsed.scoreA : 0,
      scoreB: typeof parsed.scoreB === 'number' ? parsed.scoreB : 0,
      streakA: typeof parsed.streakA === 'number' ? parsed.streakA : 0,
      streakB: typeof parsed.streakB === 'number' ? parsed.streakB : 0,
      matchNo: typeof parsed.matchNo === 'number' ? parsed.matchNo : 0,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      bannedPairs: toStringArray(parsed.bannedPairs),
      winningScore,
    };
  } catch {
    return null;
  }
}

function PickleballMixerPage() {
  const initialSnapshot = useMemo(() => readStoredSnapshot(), []);
  const [nameInput, setNameInput] = useState(initialSnapshot?.nameInput ?? defaultNames);
  const [players, setPlayers] = useState<Player[]>(() => (
    initialSnapshot ? restorePlayers(initialSnapshot.players) : createPlayers(parseNames(defaultNames))
  ));
  const [queue, setQueue] = useState<string[]>(() => initialSnapshot?.queue ?? parseNames(defaultNames));
  const [teamA, setTeamA] = useState<string[]>(() => initialSnapshot?.teamA ?? []);
  const [teamB, setTeamB] = useState<string[]>(() => initialSnapshot?.teamB ?? []);
  const [scoreA, setScoreA] = useState(initialSnapshot?.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(initialSnapshot?.scoreB ?? 0);
  const [streakA, setStreakA] = useState(initialSnapshot?.streakA ?? 0);
  const [streakB, setStreakB] = useState(initialSnapshot?.streakB ?? 0);
  const [matchNo, setMatchNo] = useState(initialSnapshot?.matchNo ?? 0);
  const [history, setHistory] = useState<MatchRecord[]>(() => initialSnapshot?.history ?? []);
  const [bannedPairs, setBannedPairs] = useState<Set<string>>(() => new Set(initialSnapshot?.bannedPairs ?? []));
  const [winningScore, setWinningScore] = useState(initialSnapshot?.winningScore ?? 15);
  const [status, setStatus] = useState(
    initialSnapshot ? '已還原上次臨打配對器資料。' : '請先載入名單，然後點「開始排場」。',
  );
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [guideSelector, setGuideSelector] = useState<string | null>(null);

  const isCourtFull = teamA.length === 2 && teamB.length === 2;
  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.played - a.played || b.wins - a.wins),
    [players],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!sessionStorage.getItem(tutorialStorageKey)) {
        openTutorial();
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!guideSelector) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(guideSelector));
    targets.forEach((target) => target.classList.add('is-guided'));
    targets[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const timer = tutorialOpen
      ? undefined
      : window.setTimeout(() => {
        targets.forEach((target) => target.classList.remove('is-guided'));
        setGuideSelector(null);
      }, 2600);

    return () => {
      if (timer) window.clearTimeout(timer);
      targets.forEach((target) => target.classList.remove('is-guided'));
    };
  }, [guideSelector, tutorialOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(currentStateStorageKey, JSON.stringify(createSnapshot()));
    } catch {
      // localStorage may be unavailable in private browsing or restricted contexts.
    }
  }, [nameInput, players, queue, teamA, teamB, scoreA, scoreB, streakA, streakB, matchNo, history, bannedPairs, winningScore]);

  function createSnapshot(): MixerSnapshot {
    return {
      savedAt: new Date().toISOString(),
      nameInput,
      players: serializePlayers(players),
      queue,
      teamA,
      teamB,
      scoreA,
      scoreB,
      streakA,
      streakB,
      matchNo,
      history,
      bannedPairs: Array.from(bannedPairs),
      winningScore,
    };
  }

  function resetScore() {
    setScoreA(0);
    setScoreB(0);
  }

  function getPlayerIndex(nextPlayers: Player[], name: string) {
    return nextPlayers.findIndex((player) => player.name === name);
  }

  function takePairFrom(currentQueue: string[], currentPlayers: Player[], currentBannedPairs: Set<string>) {
    if (currentQueue.length < 2) return { pair: [] as string[], queue: currentQueue, players: currentPlayers };

    const nextQueue = [...currentQueue].sort((a, b) => {
      const playerA = currentPlayers.find((player) => player.name === a);
      const playerB = currentPlayers.find((player) => player.name === b);
      return (playerB?.waiting || 0) - (playerA?.waiting || 0);
    });
    const nextPlayers = clonePlayers(currentPlayers);
    const first = nextQueue.shift();

    if (!first) return { pair: [] as string[], queue: nextQueue, players: nextPlayers };

    let secondIndex = nextQueue.findIndex((name) => !currentBannedPairs.has(pairKey(first, name)));
    if (secondIndex === -1) secondIndex = 0;

    const [second] = nextQueue.splice(secondIndex, 1);
    if (!second) return { pair: [] as string[], queue: nextQueue, players: nextPlayers };

    const firstIndex = getPlayerIndex(nextPlayers, first);
    const secondPlayerIndex = getPlayerIndex(nextPlayers, second);
    if (firstIndex >= 0) nextPlayers[firstIndex].partners.add(second);
    if (secondPlayerIndex >= 0) nextPlayers[secondPlayerIndex].partners.add(first);

    return { pair: [first, second], queue: nextQueue, players: nextPlayers };
  }

  function loadPlayers() {
    const names = parseNames(nameInput);
    const nextPlayers = createPlayers(names);
    setPlayers(nextPlayers);
    setQueue(names);
    setTeamA([]);
    setTeamB([]);
    setScoreA(0);
    setScoreB(0);
    setStreakA(0);
    setStreakB(0);
    setMatchNo(0);
    setHistory([]);
    setBannedPairs(new Set());
    setStatus(`已載入 ${names.length} 位球員。`);
  }

  function autoStart() {
    let nextPlayers = players;
    let nextQueue = queue;

    if (nextPlayers.length < 4) {
      const names = parseNames(nameInput);
      nextPlayers = createPlayers(names);
      nextQueue = names;
    }

    if (nextPlayers.length < 4) {
      setStatus('至少需要 4 位球員。');
      return;
    }

    const firstPair = takePairFrom(nextQueue, nextPlayers, bannedPairs);
    const secondPair = takePairFrom(firstPair.queue, firstPair.players, bannedPairs);
    setPlayers(secondPair.players);
    setQueue(secondPair.queue);
    setTeamA(firstPair.pair);
    setTeamB(secondPair.pair);
    setStreakA(0);
    setStreakB(0);
    resetScore();
    setMatchNo(1);
    setStatus('第 1 場開始。');
  }

  function declareWinner(side: Side, finalScoreA = scoreA, finalScoreB = scoreB) {
    if (teamA.length < 2 || teamB.length < 2) return;

    const winner = side === 'A' ? teamA : teamB;
    const loser = side === 'A' ? teamB : teamA;
    const currentMatchNo = matchNo || 1;
    let nextPlayers = clonePlayers(players);

    winner.forEach((name) => {
      const index = getPlayerIndex(nextPlayers, name);
      if (index >= 0) {
        nextPlayers[index].wins++;
        nextPlayers[index].played++;
      }
    });
    loser.forEach((name) => {
      const index = getPlayerIndex(nextPlayers, name);
      if (index >= 0) nextPlayers[index].played++;
    });

    const nextHistory: MatchRecord = {
      no: currentMatchNo,
      a: [...teamA],
      b: [...teamB],
      score: `${finalScoreA}：${finalScoreB}`,
      winner: side,
    };

    let nextQueue = [...queue, ...loser];
    let nextTeamA = [...teamA];
    let nextTeamB = [...teamB];
    let nextStreakA = side === 'A' ? streakA + 1 : 0;
    let nextStreakB = side === 'B' ? streakB + 1 : 0;
    const nextBannedPairs = new Set(bannedPairs);

    if (side === 'A') {
      if (nextStreakA >= 2) {
        nextBannedPairs.add(pairKey(teamA[0], teamA[1]));
        nextQueue = [...nextQueue, ...teamA];
        nextTeamA = [];
        nextTeamB = [];
        nextStreakA = 0;
        nextStreakB = 0;
        setStatus(`第 ${currentMatchNo} 場：A 隊 ${winner.join('＋')} 二連勝，強制下場並拆隊。`);
      } else {
        nextTeamB = [];
        setStatus(`第 ${currentMatchNo} 場：A 隊獲勝，留場等待挑戰。`);
      }
    } else if (nextStreakB >= 2) {
      nextBannedPairs.add(pairKey(teamB[0], teamB[1]));
      nextQueue = [...nextQueue, ...teamB];
      nextTeamA = [];
      nextTeamB = [];
      nextStreakA = 0;
      nextStreakB = 0;
      setStatus(`第 ${currentMatchNo} 場：B 隊 ${winner.join('＋')} 二連勝，強制下場並拆隊。`);
    } else {
      nextTeamA = [];
      setStatus(`第 ${currentMatchNo} 場：B 隊獲勝，留場等待挑戰。`);
    }

    nextPlayers = nextPlayers.map((player) => ({
      ...player,
      waiting: nextQueue.includes(player.name) ? player.waiting + 1 : 0,
    }));

    setPlayers(nextPlayers);
    setQueue(nextQueue);
    setTeamA(nextTeamA);
    setTeamB(nextTeamB);
    setStreakA(nextStreakA);
    setStreakB(nextStreakB);
    setBannedPairs(nextBannedPairs);
    setHistory((current) => [nextHistory, ...current]);
    resetScore();
  }

  function nextMatch() {
    if (players.length < 4) {
      setStatus('請先載入名單。');
      return;
    }

    if (isCourtFull) {
      setStatus('目前場上已排滿，請先完成本場比賽。');
      return;
    }

    let nextPlayers = players;
    let nextQueue = queue;
    let nextTeamA = teamA;
    let nextTeamB = teamB;

    if (teamA.length === 0 && teamB.length === 0) {
      const firstPair = takePairFrom(nextQueue, nextPlayers, bannedPairs);
      const secondPair = takePairFrom(firstPair.queue, firstPair.players, bannedPairs);
      nextPlayers = secondPair.players;
      nextQueue = secondPair.queue;
      nextTeamA = firstPair.pair;
      nextTeamB = secondPair.pair;
    } else if (teamA.length === 0) {
      const result = takePairFrom(nextQueue, nextPlayers, bannedPairs);
      nextPlayers = result.players;
      nextQueue = result.queue;
      nextTeamA = result.pair;
    } else if (teamB.length === 0) {
      const result = takePairFrom(nextQueue, nextPlayers, bannedPairs);
      nextPlayers = result.players;
      nextQueue = result.queue;
      nextTeamB = result.pair;
    }

    if (nextTeamA.length < 2 || nextTeamB.length < 2) {
      setStatus('等待區人數不足，無法安排下一場。');
      return;
    }

    const nextMatchNo = matchNo + 1;
    setPlayers(nextPlayers);
    setQueue(nextQueue);
    setTeamA(nextTeamA);
    setTeamB(nextTeamB);
    setMatchNo(nextMatchNo);
    resetScore();
    setStatus(`第 ${nextMatchNo} 場開始：${nextTeamA.join('＋')} vs ${nextTeamB.join('＋')}`);
  }

  function changeScore(side: Side, delta: number) {
    if (side === 'A') {
      const nextScore = Math.max(0, scoreA + delta);
      setScoreA(nextScore);
      if (nextScore >= winningScore) declareWinner('A', nextScore, scoreB);
    } else {
      const nextScore = Math.max(0, scoreB + delta);
      setScoreB(nextScore);
      if (nextScore >= winningScore) declareWinner('B', scoreA, nextScore);
    }
  }

  function shuffleQueue() {
    const nextQueue = [...queue];
    for (let i = nextQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextQueue[i], nextQueue[j]] = [nextQueue[j], nextQueue[i]];
    }
    setQueue(nextQueue);
    setStatus('等待區已洗牌。');
  }

  function resetAll() {
    if (!window.confirm('確定要重置全部資料？')) return;
    const saved = saveResetSnapshot();
    loadPlayers();
    setStatus(saved ? '已重置。重置前資料已保存到瀏覽器 localStorage。' : '已重置，但重置前資料儲存失敗。');
  }

  function saveResetSnapshot() {
    const snapshot = createSnapshot();

    try {
      localStorage.setItem(resetSnapshotStorageKey, JSON.stringify(snapshot));
      const archive = JSON.parse(localStorage.getItem(resetArchiveStorageKey) || '[]') as MixerSnapshot[];
      localStorage.setItem(resetArchiveStorageKey, JSON.stringify([snapshot, ...archive].slice(0, 10)));
      return true;
    } catch {
      return false;
    }
  }

  function updateWinningScore(value: number) {
    if (!Number.isFinite(value) || value < 1) return;
    const nextScore = Math.min(Math.round(value), 99);
    setWinningScore(nextScore);
    setStatus(`勝分已調整為 ${nextScore} 分，下一次比分變動會依此判定。`);
  }

  function showGuide(selector: string) {
    setGuideSelector(null);
    window.setTimeout(() => setGuideSelector(selector), 0);
  }

  function openTutorial() {
    setTutorialIndex(0);
    setTutorialOpen(true);
    showGuide(tutorialSteps[0].selector);
  }

  function closeTutorial() {
    setTutorialOpen(false);
    setGuideSelector(null);
    sessionStorage.setItem(tutorialStorageKey, '1');
  }

  function nextTutorialStep() {
    if (tutorialIndex >= tutorialSteps.length - 1) {
      closeTutorial();
      return;
    }

    const nextIndex = tutorialIndex + 1;
    setTutorialIndex(nextIndex);
    showGuide(tutorialSteps[nextIndex].selector);
  }

  function restartTutorial() {
    sessionStorage.removeItem(tutorialStorageKey);
    openTutorial();
  }

  function renderTeamPlayers(team: string[]) {
    if (team.length) return formatTeam(team);

    return (
      <button type="button" className="mixer-fill-team-button" onClick={nextMatch}>
        補上下一場對手
      </button>
    );
  }

  function renderUsage(className = '') {
    return (
      <section className={`mixer-usage ${className}`}>
        <div className="mixer-usage-header">
          <h3>正確操作流程</h3>
          <button type="button" className="mixer-tutorial-restart" onClick={restartTutorial}>重新查看教學</button>
        </div>
        <p className="mixer-usage-note">PS：內文 [ＸＸＸ] 表示可互動按鈕</p>
        <ol>
          <li data-guide-target="#nameInput" tabIndex={0} role="button" onClick={() => showGuide('#nameInput')}>依照格式貼上[人員名單]</li>
          <li data-guide-target="#loadPlayersButton" tabIndex={0} role="button" onClick={() => showGuide('#loadPlayersButton')}>[載入名單]</li>
          <li data-guide-target="#autoStartButton, #resetAllButton" tabIndex={0} role="button" onClick={() => showGuide('#autoStartButton, #resetAllButton')}>[開始排場] 或 [重置]</li>
          <li data-guide-target=".score-control, .winner-button" tabIndex={0} role="button" onClick={() => showGuide('.score-control, .winner-button')}>先按比分[-][＋]或直接點隊伍卡片左上角[勝]</li>
          <li>到 {winningScore} 分後，系統判定勝隊。</li>
          <li>敗隊下場。</li>
          <li data-guide-target="#nextMatchButton" tabIndex={0} role="button" onClick={() => showGuide('#nextMatchButton')}>再按 [補上下一場對手]，才會補新的挑戰隊。</li>
          <li data-guide-target="#shuffleQueueButton" tabIndex={0} role="button" onClick={() => showGuide('#shuffleQueueButton')}>(可選用) [等待區洗牌]</li>
        </ol>
      </section>
    );
  }

  const currentTutorialStep = tutorialSteps[tutorialIndex];

  return (
    <main className="mixer-page">
      <section className="mixer-hero">
        <h2>臨打配對器</h2>
        <p>落地得分制｜<span>{winningScore}</span> 分獲勝｜勝隊留場｜連勝 2 場強制下場並拆散配對</p>
      </section>

      {renderUsage('mixer-usage-mobile')}

      <div className="mixer-grid">
        <aside className="mixer-card">
          <h2>人員名單</h2>
          <textarea id="nameInput" value={nameInput} onChange={(event) => setNameInput(event.target.value)} />
          <div className="mixer-button-row">
            <button id="loadPlayersButton" type="button" onClick={loadPlayers}>載入名單</button>
            <button id="autoStartButton" type="button" className="secondary" onClick={autoStart}>開始排場</button>
            <button id="resetAllButton" type="button" className="danger" onClick={resetAll}>重置</button>
          </div>

          <hr />

          <h3>賽制規則</h3>
          <div className="mixer-empty">
            貼上「1.姓名」格式即可。系統會優先讓等待最久的人上場，並避免剛拆散的二連勝搭檔立刻再次配對。
          </div>
        </aside>

        <section className="mixer-main">
          <section className="mixer-card mixer-match-card">
            <div className="mixer-rules">
              <div className="mixer-rule mixer-rule-stack">
                <span>🎾 落地得分制</span>
                <span>👑 勝隊留場</span>
                <span>🔀 二連勝拆隊</span>
              </div>
              <div className="mixer-rule">
                <label className="mixer-score-setting" htmlFor="winningScoreInput">
                  <span>🏁 勝分</span>
                  <span className="mixer-score-setting-control">
                    <span className="mixer-score-stepper">
                      <button type="button" aria-label="降低勝分" onClick={() => updateWinningScore(winningScore - 1)}>−</button>
                      <input
                        id="winningScoreInput"
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={winningScore}
                        inputMode="numeric"
                        onChange={(event) => updateWinningScore(event.currentTarget.valueAsNumber)}
                      />
                      <button type="button" aria-label="提高勝分" onClick={() => updateWinningScore(winningScore + 1)}>＋</button>
                    </span>
                    <span>分</span>
                  </span>
                </label>
              </div>
            </div>

            {renderUsage('mixer-usage-desktop')}

            <section className="mixer-rally-rules" aria-label="落地得分制詳細介紹">
              <h3>落地得分制詳細介紹</h3>
              <div className="mixer-rally-rule-item">
                <strong>1. 得分方式</strong>
                <p>每一回合都會有人得到 1 分。無論是發球方或接發球方，只要贏下該回合都會加分。</p>
              </div>
              <div className="mixer-rally-rule-item">
                <strong>2. 發球順序常見做法</strong>
                <p>落地得分制有不同版本；在 USA Pickleball 的選用規則精神中，常見做法是一隊通常只安排一位發球者，輸了回合就換到對方發球。這樣可以讓節奏更快、比分更緊湊，也讓時間更容易預估。</p>
              </div>
              <div className="mixer-rally-rule-item">
                <strong>3. 比賽結束條件常見選項</strong>
                <p>落地得分制常用局數與分數會依主辦單位調整，例如一隊先到 {winningScore} 分獲勝。</p>
              </div>
            </section>

            <div className="mixer-status">{status}</div>

            <div className="mixer-court">
              <div id="teamABox" className={`mixer-team ${teamA.length === 2 ? 'active' : ''}`}>
                <button type="button" className="warning winner-button" onClick={() => declareWinner('A')}>勝</button>
                <div className="mixer-team-title">
                  <span>A 隊</span>
                  <span>{streakA} 連勝</span>
                </div>
                <div className="mixer-players">{renderTeamPlayers(teamA)}</div>
                <div className="mixer-score">
                  <button type="button" className="score-control" onClick={() => changeScore('A', -1)}>−</button>
                  <strong>{scoreA}</strong>
                  <button type="button" className="score-control" onClick={() => changeScore('A', 1)}>＋</button>
                </div>
              </div>

              <div id="teamBBox" className={`mixer-team ${teamB.length === 2 ? 'active' : ''}`}>
                <button type="button" className="warning winner-button" onClick={() => declareWinner('B')}>勝</button>
                <div className="mixer-team-title">
                  <span>B 隊</span>
                  <span>{streakB} 連勝</span>
                </div>
                <div className="mixer-players">{renderTeamPlayers(teamB)}</div>
                <div className="mixer-score">
                  <button type="button" className="score-control" onClick={() => changeScore('B', -1)}>−</button>
                  <strong>{scoreB}</strong>
                  <button type="button" className="score-control" onClick={() => changeScore('B', 1)}>＋</button>
                </div>
              </div>
            </div>

            <button id="nextMatchButton" type="button" onClick={nextMatch} disabled={isCourtFull}>補上下一場對手</button>
            <button id="shuffleQueueButton" type="button" className="secondary" onClick={shuffleQueue}>等待區洗牌</button>
          </section>

          <section className="mixer-lists">
            <div className="mixer-card">
              <h2>等待區</h2>
              {queue.length ? (
                queue.map((name, index) => {
                  const player = players.find((item) => item.name === name);
                  return (
                    <div className="mixer-person" key={`${name}-${index}`}>
                      <span>{index + 1}. {name}</span>
                      <small>等待 {player?.waiting || 0}</small>
                    </div>
                  );
                })
              ) : (
                <div className="mixer-empty">目前沒有等待球員</div>
              )}
            </div>

            <div className="mixer-card">
              <h2>出場統計</h2>
              {sortedPlayers.length ? (
                sortedPlayers.map((player) => (
                  <div className="mixer-person" key={player.name}>
                    <span>{player.name}</span>
                    <small>出場 {player.played}｜勝 {player.wins}｜搭檔 {player.partners.size}</small>
                  </div>
                ))
              ) : (
                <div className="mixer-empty">尚無資料</div>
              )}
            </div>
          </section>

          <section className="mixer-card">
            <h2>比賽紀錄</h2>
            <div className="mixer-history">
              {history.length ? (
                history.map((match) => (
                  <div className="mixer-match" key={`${match.no}-${match.score}-${match.winner}`}>
                    <strong>第 {match.no} 場</strong><br />
                    A：{match.a.join('＋')} vs B：{match.b.join('＋')}<br />
                    比分：{match.score}｜勝隊：{match.winner} 隊
                  </div>
                ))
              ) : (
                <div className="mixer-empty">尚無比賽紀錄</div>
              )}
            </div>
          </section>
        </section>
      </div>

      {tutorialOpen && (
        <div className="mixer-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle" aria-describedby="tutorialText">
          <section className="mixer-tutorial-panel">
            <div className="mixer-tutorial-step">教學 {tutorialIndex + 1} / {tutorialSteps.length}</div>
            <h2 id="tutorialTitle">{currentTutorialStep.title}</h2>
            <p id="tutorialText">{currentTutorialStep.text}</p>
            <div className="mixer-tutorial-actions">
              <button type="button" className="mixer-tutorial-skip" onClick={closeTutorial}>跳過教學</button>
              <button type="button" onClick={nextTutorialStep}>
                {tutorialIndex === tutorialSteps.length - 1 ? '完成' : '下一步'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default PickleballMixerPage;
