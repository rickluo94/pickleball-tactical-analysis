import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './PickleAwardsRankingPage.css';

type AwardVote = {
  name: string;
  votes: number;
  order: number;
};

type Award = {
  id: string;
  name: string;
  description: string;
  icon: string;
  totalVotes: number;
  winner: string;
  winnerVotes: number;
  winnerReason: string;
  isTie: boolean;
  votes: AwardVote[];
};

type AwardsData = {
  title: string;
  subtitle: string;
  updatedAt: string;
  totalResponses: number;
  tieBreakRule: {
    title: string;
    description: string;
    firstSubmittedAt: string;
    firstCandidate: string;
    affectedAwards: string[];
  };
  awards: Award[];
};

function VoteRow({
  item,
  index,
  totalVotes,
  maxVotes,
  isWinner,
}: {
  item: AwardVote;
  index: number;
  totalVotes: number;
  maxVotes: number;
  isWinner: boolean;
}) {
  const percentage = totalVotes > 0 ? Math.round((item.votes / totalVotes) * 100) : 0;
  const barWidth = Math.max((item.votes / Math.max(maxVotes, 1)) * 100, 8);

  return (
    <li className={`awards-vote-row ${isWinner ? 'is-winner' : ''}`}>
      <div className="awards-rank-number" aria-label={`第 ${index + 1} 名`}>
        {index + 1}
      </div>
      <div className="awards-candidate-block">
        <div className="awards-candidate-meta">
          <strong>{item.name}</strong>
          <span>{item.votes} 票 · {percentage}%</span>
        </div>
        <div className="awards-vote-track" aria-hidden="true">
          <div className="awards-vote-bar" style={{ width: `${barWidth}%` }} />
        </div>
      </div>
    </li>
  );
}

function AwardCard({ award, index }: { award: Award; index: number }) {
  const sortedVotes = [...award.votes].sort((a, b) => b.votes - a.votes || a.order - b.order);
  const maxVotes = Math.max(...award.votes.map((item) => item.votes), 1);

  return (
    <article className="awards-card" style={{ '--delay': `${index * 70}ms` } as CSSProperties}>
      <div className="awards-card-heading">
        <div className="awards-icon" aria-hidden="true">{award.icon}</div>
        <div>
          <p className="awards-number">AWARD {String(index + 1).padStart(2, '0')}</p>
          <h2>{award.name}</h2>
          <p className="awards-description">{award.description}</p>
        </div>
      </div>

      <div className="awards-winner-panel">
        <div>
          <p className="awards-winner-label">最高票代表</p>
          <p className="awards-winner-name">{award.winner}</p>
        </div>
        <div className="awards-winner-votes">
          <strong>{award.winnerVotes}</strong>
          <span>票</span>
        </div>
      </div>

      <p className="awards-winner-reason">
        <span className={award.isTie ? 'awards-tie-badge' : 'awards-top-badge'}>
          {award.isTie ? '平手遞補' : '最高票'}
        </span>
        {award.winnerReason}
      </p>

      <ol className="awards-vote-list">
        {sortedVotes.map((item, voteIndex) => (
          <VoteRow
            key={`${award.id}-${item.name}`}
            item={item}
            index={voteIndex}
            totalVotes={award.totalVotes}
            maxVotes={maxVotes}
            isWinner={item.name === award.winner}
          />
        ))}
      </ol>
    </article>
  );
}

function LoadingState() {
  return (
    <main className="awards-ranking-page awards-error-page">
      <div className="awards-error-card">
        <p className="awards-eyebrow dark">LOADING</p>
        <h1>正在讀取排行榜</h1>
        <p>資料來源：<code>public/data/awards.json</code></p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="awards-ranking-page awards-error-page">
      <div className="awards-error-card">
        <p className="awards-eyebrow dark">DATA ERROR</p>
        <h1>排行榜資料讀取失敗</h1>
        <p>請確認 <code>public/data/awards.json</code> 檔案存在，並透過網站伺服器開啟此頁。</p>
        {message && <p><small>{message}</small></p>}
      </div>
    </main>
  );
}

function RankingPage({ data }: { data: AwardsData }) {
  const overallWinner = useMemo(() => {
    const wins = data.awards.reduce<Record<string, number>>((result, award) => {
      result[award.winner] = (result[award.winner] || 0) + 1;
      return result;
    }, {});

    return Object.entries(wins).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-Hant'))[0] ?? ['尚未產生', 0];
  }, [data.awards]);

  const tieCount = data.awards.filter((award) => award.isTie).length;

  return (
    <main className="awards-ranking-page">
      <section className="awards-hero">
        <div className="awards-hero-noise" />
        <div className="awards-container awards-hero-content">
          <div>
            <p className="awards-eyebrow">PICKLE TODAY · PLAYER AWARDS</p>
            <h1>{data.title}</h1>
            <p className="awards-hero-description">
              {data.subtitle}，本次共收到 <strong>{data.totalResponses} 份回覆</strong>。
            </p>
          </div>

          <div className="awards-overall-card">
            <p>本屆獲獎代表</p>
            <strong>{overallWinner[0]}</strong>
            <span>共代表 {overallWinner[1]} 個獎項</span>
          </div>
        </div>
      </section>

      <section className="awards-summary-section">
        <div className="awards-container awards-summary-grid">
          <div className="awards-summary-item">
            <span>獎項數</span>
            <strong>{data.awards.length}</strong>
          </div>
          <div className="awards-summary-item">
            <span>有效回覆</span>
            <strong>{data.totalResponses}</strong>
          </div>
          <div className="awards-summary-item">
            <span>平手獎項</span>
            <strong>{tieCount}</strong>
          </div>
          <div className="awards-summary-item">
            <span>統計狀態</span>
            <strong className="awards-status-text">已完成</strong>
          </div>
        </div>
      </section>

      <section className="awards-ranking-section">
        <div className="awards-container">
          <div className="awards-section-heading">
            <div>
              <p className="awards-eyebrow dark">VOTE RESULTS</p>
              <h2>各獎項得票排行</h2>
            </div>
            <p>票數相同時，依照表單提交時間決定代表順位。</p>
          </div>

          <div className="awards-grid">
            {data.awards.map((award, index) => (
              <AwardCard key={award.id} award={award} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="awards-rule-section">
        <div className="awards-container">
          <div className="awards-rule-card">
            <div className="awards-rule-index">RULE</div>
            <div>
              <p className="awards-eyebrow dark">TIE-BREAK POLICY</p>
              <h2>{data.tieBreakRule.title}</h2>
              <p>{data.tieBreakRule.description}</p>

              <div className="awards-rule-detail">
                <div>
                  <span>第一位提交時間</span>
                  <strong>{data.tieBreakRule.firstSubmittedAt}</strong>
                </div>
                <div>
                  <span>優先候選人</span>
                  <strong>{data.tieBreakRule.firstCandidate}</strong>
                </div>
              </div>

              <p className="awards-affected-awards">
                適用獎項：{data.tieBreakRule.affectedAwards.join('、')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="awards-data-footer">
        <div className="awards-container awards-footer-content">
          <span>Pickle Today</span>
          <span>資料更新時間：{data.updatedAt}</span>
        </div>
      </section>
    </main>
  );
}

export default function PickleAwardsRankingPage() {
  const [data, setData] = useState<AwardsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadAwards() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/awards.json`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as AwardsData;
        setData(result);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== 'AbortError') {
          console.error(loadError);
          setError(loadError.message);
        }
      }
    }

    loadAwards();
    return () => controller.abort();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  return <RankingPage data={data} />;
}
