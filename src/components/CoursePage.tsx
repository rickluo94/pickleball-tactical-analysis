import './CoursePage.css';

const courseWeeks = [
  {
    title: '第一週：發球與接發球戰術兼規則奠基',
    date: '7 月 6 日 (一)',
    content: '掌握發球與接發球技巧、計分機制、雙跳球規則與基礎站位。',
  },
  {
    title: '第二週：底線正反手抽球與控球',
    date: '7 月 13 日 (一)',
    content: '建立穩定的正、反手擊球慣性，提升底線對峙時的球速與落點控制。',
  },
  {
    title: '第三週：過渡區推進與上網技巧',
    date: '7 月 20 日 (一)',
    content: '學習如何在「不可回擊區（廚房區）」外進行安全過渡，掌握流暢上網的腳步與時機。',
  },
  {
    title: '第四週：網前丁克球與截擊攻防戰',
    date: '7 月 27 日 (一)',
    content: '廚房區的細膩網前小球（Dink）拉鋸、突擊截擊技巧，以及網前封網的實戰應用。',
  },
];

function CoursePage() {
  return (
    <main className="course-page">
      <header className="course-hero">
        <h2>四週系統化匹克球基礎奠定班</h2>
        <p className="course-subtitle">每週一升級 ‧ 打造穩健實戰力</p>
        <div className="course-tags">
          <span>2026 年 7 月份課程</span>
          <span>新手的第一個家</span>
          <span>每週開課自由選</span>
        </div>
      </header>

      <section className="course-timeline" aria-label="四週課程內容">
        {courseWeeks.map((week) => (
          <article className="course-card" key={week.title}>
            <div className="course-card-header">
              <h3>{week.title}</h3>
              <span>{week.date}</span>
            </div>
            <div className="course-card-body">
              <strong>內容核心</strong>
              <p>{week.content}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default CoursePage;
