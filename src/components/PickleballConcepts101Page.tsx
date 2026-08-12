import { useEffect, useMemo, useState } from 'react';
import './PickleballConcepts101Page.css';

type ConceptArticle = {
  id: string;
  episode: string;
  level: string;
  topic: string;
  title: string;
  body: string[];
  hashtags: string[];
};

type ConceptsData = {
  title: string;
  subtitle: string;
  articles: ConceptArticle[];
};

function LoadingState() {
  return (
    <main className="concepts-page concepts-state-page">
      <div className="concepts-state-card">
        <p>LOADING</p>
        <h1>正在讀取觀念101</h1>
        <span>資料來源：public/data/concepts-101.json</span>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="concepts-page concepts-state-page">
      <div className="concepts-state-card">
        <p>DATA ERROR</p>
        <h1>觀念101資料讀取失敗</h1>
        <span>請確認 public/data/concepts-101.json 存在，並透過網站伺服器開啟此頁。</span>
        {message && <small>{message}</small>}
      </div>
    </main>
  );
}

function formatFooter(article: ConceptArticle) {
  return `${article.episode}｜${article.level}｜${article.topic}`;
}

function ConceptArticleCard({ article }: { article: ConceptArticle }) {
  return (
    <article className="concepts-article" id={article.id}>
      <div className="concepts-article-meta">
        <span>{article.episode}</span>
        <span>{article.level}</span>
        <span>{article.topic}</span>
      </div>

      <h2>{article.episode}｜{article.title}</h2>

      <div className="concepts-body">
        {article.body.map((paragraph, index) => (
          <p key={`${article.id}-${index}`}>{paragraph}</p>
        ))}
      </div>

      <footer className="concepts-article-footer">
        <p>{formatFooter(article)}</p>
        <div className="concepts-hashtags" aria-label="文章標籤">
          {article.hashtags.map((tag) => (
            <span key={`${article.id}-${tag}`}>#{tag}</span>
          ))}
        </div>
      </footer>
    </article>
  );
}

function ConceptsListPage({ data }: { data: ConceptsData }) {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const articles = useMemo(() => {
    return [...data.articles].sort((a, b) => {
      const result = a.episode.localeCompare(b.episode, 'zh-Hant', { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [data.articles, sortDirection]);
  const sortLabel = sortDirection === 'asc' ? '正序' : '倒序';

  return (
    <main className="concepts-page">
      <section className="concepts-hero">
        <div>
          <p>{data.subtitle}</p>
          <h1>{data.title}</h1>
        </div>
        <div className="concepts-count">
          <strong>{articles.length}</strong>
          <span>篇觀念</span>
        </div>
      </section>

      <section className="concepts-layout" aria-label="觀念文章列表">
        <aside className="concepts-index">
          <button
            type="button"
            className="concepts-index-sort"
            onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            aria-label={`目前為${sortLabel}，點擊切換排序`}
          >
            <span>EP INDEX</span>
            <strong>{sortLabel}</strong>
          </button>
          <nav aria-label="觀念101文章索引">
            {articles.map((article) => (
              <a href={`#${article.id}`} key={article.id}>
                <span>{article.episode}</span>
                {article.topic}
              </a>
            ))}
          </nav>
        </aside>

        <div className="concepts-list">
          {articles.map((article) => (
            <ConceptArticleCard article={article} key={article.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default function PickleballConcepts101Page() {
  const [data, setData] = useState<ConceptsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadConcepts() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/concepts-101.json`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json() as ConceptsData;
        setData(result);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== 'AbortError') {
          console.error(loadError);
          setError(loadError.message);
        }
      }
    }

    loadConcepts();
    return () => controller.abort();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  return <ConceptsListPage data={data} />;
}
