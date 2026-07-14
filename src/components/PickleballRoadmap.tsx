import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './PickleballRoadmap.css';

type StageLevel = 'beginner' | 'intermediate' | 'advanced';

type Stage = {
  id: string;
  title: string;
  level: StageLevel;
  topics: string[];
};

type Progress = Record<string, boolean>;

type Connector = {
  id: string;
  path: string;
};

const stages: Stage[] = [
  {
    id: 'basics',
    title: '1. 基礎入門',
    level: 'beginner',
    topics: ['什麼是匹克球？', '基本規則', '計分方式', '場地與線區', '雙彈規則', 'NVZ / Kitchen 是什麼？'],
  },
  {
    id: 'gear',
    title: '2. 裝備與場地',
    level: 'beginner',
    topics: ['球拍選擇', '室內球 / 室外球', '鞋子與護具', '場地尺寸'],
  },
  {
    id: 'grip',
    title: '3. 握拍與基本動作',
    level: 'beginner',
    topics: ['大陸式握拍', '正手', '反手', '準備姿勢'],
  },
  {
    id: 'serve',
    title: '4. 發球 / 接發球',
    level: 'beginner',
    topics: ['穩定深發球', '深回發球', '回發後上網', '落點控制'],
  },
  {
    id: 'dink',
    title: '5. Dink 與 Kitchen',
    level: 'beginner',
    topics: ['正反手 Dink', '斜線與直線', '控制過網高度', '辨識可攻擊球'],
  },
  {
    id: 'third-shot',
    title: '6. 第三拍：Drop / Drive',
    level: 'intermediate',
    topics: ['第三拍吊短', '第三拍強抽', '長 Dink', '分段上網'],
  },
  {
    id: 'volley',
    title: '7. 截擊與網前控制',
    level: 'intermediate',
    topics: ['正反手截擊', '擋球與 Reset', '身體球處理', '攻防轉換'],
  },
  {
    id: 'footwork',
    title: '8. 腳步與站位',
    level: 'intermediate',
    topics: ['Split Step', '同步前進', '左右補位', '轉換區停穩擊球'],
  },
  {
    id: 'doubles',
    title: '9. 雙打配合與戰術',
    level: 'intermediate',
    topics: ['堆疊 Stacking', '中線溝通', '目標打點', '攻防轉換', '失誤管理'],
  },
  {
    id: 'match',
    title: '10. 比賽實戰',
    level: 'advanced',
    topics: ['情境對戰', '比分策略', '對手弱點分析', '節奏變化'],
  },
  {
    id: 'training',
    title: '11. 訓練與進階提升',
    level: 'advanced',
    topics: ['降低非受迫性失誤', '提升受迫防守成功率', '影片檢討', '週期訓練'],
  },
];

const levelLabel: Record<StageLevel, string> = {
  beginner: '初學核心',
  intermediate: '中階能力',
  advanced: '實戰進階',
};

const storageKey = 'pickleball-roadmap-progress-v1';

function getStoredProgress(): Progress {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <span className={`check-icon ${active ? 'is-active' : ''}`} aria-hidden="true">
      {active ? '✓' : ''}
    </span>
  );
}

function TopicItem({
  stageId,
  topic,
  completed,
  onToggle,
  itemRef,
}: {
  stageId: string;
  topic: string;
  completed: boolean;
  onToggle: (key: string) => void;
  itemRef: (element: HTMLButtonElement | null) => void;
}) {
  const key = `${stageId}::${topic}`;
  return (
    <button
      ref={itemRef}
      type="button"
      className={`topic-item ${completed ? 'is-complete' : ''}`}
      onClick={() => onToggle(key)}
      aria-pressed={completed}
    >
      <span>{topic}</span>
      <CheckIcon active={completed} />
    </button>
  );
}

function StageRow({
  stage,
  progress,
  onToggle,
  compact,
  highlighted,
  stageRef,
  getTopicRef,
}: {
  stage: Stage;
  progress: Progress;
  onToggle: (key: string) => void;
  compact: boolean;
  highlighted: boolean;
  stageRef: (element: HTMLButtonElement | null) => void;
  getTopicRef: (topic: string) => (element: HTMLButtonElement | null) => void;
}) {
  const completedCount = stage.topics.filter((topic) => progress[`${stage.id}::${topic}`]).length;
  const isDone = completedCount === stage.topics.length;

  return (
    <section className={`stage-row ${compact ? 'is-compact' : ''} ${highlighted ? 'is-highlighted' : ''}`} id={stage.id}>
      <div className="stage-node-wrap">
        <button
          ref={stageRef}
          type="button"
          className={`stage-node level-${stage.level} ${isDone ? 'is-complete' : ''}`}
          onClick={() => {
            const shouldComplete = !isDone;
            stage.topics.forEach((topic) => {
              const key = `${stage.id}::${topic}`;
              if (Boolean(progress[key]) !== shouldComplete) onToggle(key);
            });
          }}
          aria-label={`${stage.title}，完成 ${completedCount}/${stage.topics.length}`}
        >
          <span className="stage-title">{stage.title}</span>
          <span className="stage-meta">{levelLabel[stage.level]} · {completedCount}/{stage.topics.length}</span>
        </button>
      </div>

      <div className="branch" aria-label={`${stage.title}學習項目`}>
        <span className="branch-trunk" aria-hidden="true" />
        <div className="topic-list">
          {stage.topics.map((topic) => (
            <TopicItem
              key={topic}
              stageId={stage.id}
              topic={topic}
              completed={Boolean(progress[`${stage.id}::${topic}`])}
              onToggle={onToggle}
              itemRef={getTopicRef(topic)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PickleballRoadmap() {
  const [progress, setProgress] = useState(getStoredProgress);
  const [showIntro, setShowIntro] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [highlightStageId, setHighlightStageId] = useState<string | null>(null);
  const [isMobileNavCollapsed, setIsMobileNavCollapsed] = useState(false);
  const [isSidebarFixed, setIsSidebarFixed] = useState(false);
  const pageGridRef = useRef<HTMLElement | null>(null);
  const roadmapListRef = useRef<HTMLDivElement | null>(null);
  const stageNodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const topicItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  }, [progress]);

  const allTopics = stages.flatMap((stage) => stage.topics.map((topic) => `${stage.id}::${topic}`));
  const completeTotal = allTopics.filter((key) => progress[key]).length;
  const progressPercent = Math.round((completeTotal / allTopics.length) * 100);

  const toggleTopic = (key: string) => {
    setProgress((current) => ({ ...current, [key]: !current[key] }));
  };

  const resetProgress = () => {
    if (window.confirm('確定要清除全部學習進度嗎？')) setProgress({});
  };

  const focusBeginnerStage = () => {
    document.getElementById('basics')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightStageId('basics');

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightStageId(null);
      highlightTimerRef.current = null;
    }, 3200);
  };

  const updateConnectors = useCallback(() => {
    const container = roadmapListRef.current;
    if (!container) {
      setConnectors([]);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const nextConnectors = stages.flatMap((stage) => {
      const stageElement = stageNodeRefs.current[stage.id];
      if (!stageElement) return [];

      const stageRect = stageElement.getBoundingClientRect();
      const startX = stageRect.right - containerRect.left;
      const startY = stageRect.top + stageRect.height / 2 - containerRect.top;

      return stage.topics.flatMap((topic) => {
        const key = `${stage.id}::${topic}`;
        const topicElement = topicItemRefs.current[key];
        if (!topicElement) return [];

        const topicRect = topicElement.getBoundingClientRect();
        const endX = topicRect.left - containerRect.left;
        const endY = topicRect.top + topicRect.height / 2 - containerRect.top;
        const middleX = startX + Math.max(28, (endX - startX) * 0.55);
        const path = `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`;

        return [{ id: key, path }];
      });
    });

    setConnectors(nextConnectors);
  }, []);

  useLayoutEffect(() => {
    updateConnectors();
  }, [progress, showIntro, updateConnectors]);

  useEffect(() => {
    updateConnectors();
    window.addEventListener('resize', updateConnectors);

    const resizeObserver = new ResizeObserver(updateConnectors);
    if (roadmapListRef.current) {
      resizeObserver.observe(roadmapListRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateConnectors);
      resizeObserver.disconnect();
    };
  }, [updateConnectors]);

  useEffect(() => {
    const updateSidebarPosition = () => {
      const pageGrid = pageGridRef.current;
      if (!pageGrid || window.innerWidth <= 920) {
        setIsSidebarFixed(false);
        return;
      }

      const fixedTop = 72;
      const pageGridTop = pageGrid.getBoundingClientRect().top + window.scrollY;
      setIsSidebarFixed(window.scrollY >= pageGridTop - fixedTop);
    };

    updateSidebarPosition();
    window.addEventListener('scroll', updateSidebarPosition, { passive: true });
    window.addEventListener('resize', updateSidebarPosition);

    return () => {
      window.removeEventListener('scroll', updateSidebarPosition);
      window.removeEventListener('resize', updateSidebarPosition);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  return (
    <main className="roadmap-page">
      <div className="app-shell">
      <section className="community-banner">
        <span>♧ 加入其他球友，一起追蹤匹克球學習進度</span>
        <div className="banner-actions">
          <span className="progress-copy">{completeTotal}/{allTopics.length} 已完成</span>
          <button type="button" onClick={resetProgress}>重設</button>
        </div>
      </section>

      <button type="button" className="intro-toggle" onClick={() => setShowIntro((v) => !v)}>
        <span>ⓘ 什麼是匹克球學習路線？</span>
        <span>{showIntro ? '⌃' : '⌄'}</span>
      </button>

      {showIntro && (
        <section className="intro-panel">
          依序建立規則、發接發、網前控制、第三拍、Reset 與雙打戰術。點選右側項目可記錄完成狀態，進度會保存在瀏覽器中。
        </section>
      )}

      <section className="roadmap-hero" aria-labelledby="roadmap-title">
        <div className="title-block">
          <span>學習路線</span>
          <h1 id="roadmap-title">Pickleball</h1>
          <p>從穩定控球，到雙打戰術與比賽決策</p>
        </div>

        <div className="progress-card" aria-label={`總進度 ${progressPercent}%`}>
          <div>
            <strong>學習進度</strong>
            <span>{progressPercent}%</span>
          </div>
          <div className="progress-track"><span style={{ width: `${progressPercent}%` }} /></div>
        </div>
      </section>

      <section className="page-grid" ref={pageGridRef}>
        <aside className={`left-column ${isSidebarFixed ? 'is-fixed' : ''}`}>
          <section className="panel legend-panel">
            <div className="legend-row"><span className="legend-dot purple">✓</span><span>建議先學</span></div>
            <div className="legend-row"><span className="legend-dot green">✓</span><span>已學習</span></div>
            {/*<div className="legend-row"><span className="legend-dot gray">✓</span><span>順序可彈性調整</span></div>*/}
          </section>

          <section className="panel related-panel">
            <h2>相關學習路線</h2>
            <a href="#basics">→ 初學基礎</a>
            <a href="#doubles">→ 雙打戰術</a>
            <a href="#match">→ 比賽實戰</a>
            <a href="#training">→ 教練與訓練</a>
          </section>

          <section className="panel note-panel">
            <p>規則、發接發、Dink 與站位是匹克球核心。建議用大量情境練習與雙打實戰建立節奏感。</p>
            <button type="button" onClick={focusBeginnerStage}>
              回到基礎入門
            </button>
          </section>
        </aside>

        <section className="roadmap-column">
          <div className="roadmap-list" ref={roadmapListRef}>
            <svg className="roadmap-connector-layer" aria-hidden="true">
              {connectors.map((connector) => (
                <path key={connector.id} d={connector.path} />
              ))}
            </svg>
            {stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                progress={progress}
                onToggle={toggleTopic}
                compact={false}
                highlighted={highlightStageId === stage.id}
                stageRef={(element) => {
                  stageNodeRefs.current[stage.id] = element;
                }}
                getTopicRef={(topic) => (element) => {
                  topicItemRefs.current[`${stage.id}::${topic}`] = element;
                }}
              />
            ))}
          </div>
        </section>
      </section>

      <nav className={`mobile-roadmap-nav ${isMobileNavCollapsed ? 'is-collapsed' : ''}`} aria-label="學習路線快速導覽">
        <button
          type="button"
          className="mobile-roadmap-toggle"
          onClick={() => setIsMobileNavCollapsed((current) => !current)}
          aria-label={isMobileNavCollapsed ? '展開快捷列' : '收合快捷列'}
          aria-expanded={!isMobileNavCollapsed}
        >
          {isMobileNavCollapsed ? '+' : '−'}
        </button>
        <a href="#basics">基礎</a>
        <a href="#doubles">雙打</a>
        <a href="#match">實戰</a>
        <a href="#training">訓練</a>
        <button type="button" className="mobile-roadmap-home" onClick={focusBeginnerStage} aria-label="回到基礎入門">↑</button>
      </nav>
      {highlightStageId && (
        <div className="mobile-roadmap-toast" role="status">
          從這裡、計分與 Kitchen 基礎
        </div>
      )}
      </div>
    </main>
  );
}

export default PickleballRoadmap;
