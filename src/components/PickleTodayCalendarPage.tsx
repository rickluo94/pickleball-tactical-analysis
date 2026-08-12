import { useEffect, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import zhTwLocale from '@fullcalendar/core/locales/zh-tw';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import './PickleTodayCalendarPage.css';

type CalendarEventType = 'class' | 'play' | 'experience' | 'tournament';
type CalendarEventStatus = 'open' | 'almostFull' | 'full' | 'closed' | 'cancelled';
type CalendarFilter = CalendarEventType | 'all';

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  type: CalendarEventType;
  location?: string;
  level?: string;
  price?: number;
  maxPlayers?: number;
  currentPlayers?: number;
  status: CalendarEventStatus;
  description?: string;
  registrationUrl?: string;
};

type SelectedEvent = Omit<CalendarEvent, 'start' | 'end'> & {
  start: Date | null;
  end: Date | null;
};

const typeLabels: Record<CalendarEventType, string> = {
  class: '課程',
  play: '臨打',
  experience: '體驗',
  tournament: '比賽',
};

const statusLabels: Record<CalendarEventStatus, string> = {
  open: '開放報名',
  almostFull: '即將額滿',
  full: '已額滿',
  closed: '報名截止',
  cancelled: '活動取消',
};

const filters: Array<[CalendarFilter, string]> = [
  ['all', '全部'],
  ['class', '課程'],
  ['play', '臨打'],
  ['experience', '體驗'],
  ['tournament', '比賽'],
];

function formatDate(date: Date | null) {
  if (!date) return '';

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

function formatTime(date: Date | null) {
  if (!date) return '';

  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function PickleTodayCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SelectedEvent | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/events.json`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as CalendarEvent[];
        setEvents(data);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== 'AbortError') {
          console.error(loadError);
          setError('目前無法讀取活動資料，請稍後再試。');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();
    return () => controller.abort();
  }, []);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as Partial<CalendarEvent>;

    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.start,
      end: info.event.end,
      type: props.type ?? 'play',
      location: props.location,
      level: props.level,
      price: props.price,
      maxPlayers: props.maxPlayers,
      currentPlayers: props.currentPlayers,
      status: props.status ?? 'open',
      description: props.description,
      registrationUrl: props.registrationUrl,
    });
  }

  function renderEventContent(info: EventContentArg) {
    const props = info.event.extendedProps as Partial<CalendarEvent>;

    return (
      <div className="calendar-event-chip">
        <div className="calendar-event-chip-time">{info.timeText}</div>
        <div className="calendar-event-chip-title">{info.event.title}</div>
        <div className="calendar-event-chip-meta">
          {props.status === 'full'
            ? '已額滿'
            : props.status === 'cancelled'
              ? '已取消'
              : props.location}
        </div>
      </div>
    );
  }

  return (
    <main className="calendar-page">
      <section className="calendar-hero">
        <div>
          {/*<div className="calendar-eyebrow">Pickle Today 新手村</div>*/}
          <h1>活動日曆</h1>
          {/*<p>查看近期匹克球課程、臨打、體驗與交流活動。</p>*/}
        </div>

        <div className="calendar-filter-group" aria-label="活動類型篩選">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? 'calendar-filter active' : 'calendar-filter'}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="calendar-card">
        {loading && <div className="calendar-state-message">活動載入中...</div>}
        {error && <div className="calendar-state-message error">{error}</div>}

        {!loading && !error && (
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            events={filteredEvents}
            firstDay={1}
            locale={zhTwLocale}
            fixedWeekCount={false}
            dayMaxEvents={3}
            displayEventEnd
            height="auto"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            buttonText={{
              today: '今天',
            }}
            titleFormat={{
              year: 'numeric',
              month: 'long',
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            eventContent={renderEventContent}
            eventClick={handleEventClick}
            eventClassNames={(arg) => {
              const { type, status } = arg.event.extendedProps as Partial<CalendarEvent>;
              return [`calendar-event-${type || 'default'}`, `calendar-status-${status || 'open'}`];
            }}
          />
        )}
      </section>

      <section className="calendar-legend">
        <span><i className="calendar-dot class-dot" />課程</span>
        <span><i className="calendar-dot play-dot" />臨打</span>
        <span><i className="calendar-dot experience-dot" />體驗</span>
        <span><i className="calendar-dot tournament-dot" />比賽</span>
      </section>

      {selectedEvent && (
        <div className="calendar-modal-backdrop" onClick={() => setSelectedEvent(null)}>
          <article className="calendar-event-modal" onClick={(event) => event.stopPropagation()}>
            <button
              className="calendar-modal-close"
              type="button"
              aria-label="關閉"
              onClick={() => setSelectedEvent(null)}
            >
              ×
            </button>

            <div className="calendar-modal-tags">
              <span>{typeLabels[selectedEvent.type] || '活動'}</span>
              <span className={`calendar-status-tag ${selectedEvent.status || 'open'}`}>
                {statusLabels[selectedEvent.status] || '開放報名'}
              </span>
            </div>

            <h2>{selectedEvent.title}</h2>

            <dl className="calendar-detail-list">
              <div>
                <dt>日期</dt>
                <dd>{formatDate(selectedEvent.start)}</dd>
              </div>
              <div>
                <dt>時間</dt>
                <dd>
                  {formatTime(selectedEvent.start)}
                  {selectedEvent.end ? ` – ${formatTime(selectedEvent.end)}` : ''}
                </dd>
              </div>
              <div>
                <dt>地點</dt>
                <dd>{selectedEvent.location || '待公告'}</dd>
              </div>
              <div>
                <dt>程度</dt>
                <dd>{selectedEvent.level || '不限'}</dd>
              </div>
              <div>
                <dt>費用</dt>
                <dd>
                  {typeof selectedEvent.price === 'number'
                    ? `NT$${selectedEvent.price.toLocaleString('zh-TW')}`
                    : '待公告'}
                </dd>
              </div>
              <div>
                <dt>名額</dt>
                <dd>
                  {selectedEvent.maxPlayers
                    ? `${selectedEvent.currentPlayers || 0} / ${selectedEvent.maxPlayers} 人`
                    : '不限'}
                </dd>
              </div>
            </dl>

            {selectedEvent.description && (
              <div className="calendar-description-box">
                <h3>活動內容</h3>
                <p>{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.registrationUrl &&
              !['full', 'closed', 'cancelled'].includes(selectedEvent.status) && (
                <a
                  className="calendar-primary-button"
                  href={selectedEvent.registrationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看報名資訊
                </a>
              )}
          </article>
        </div>
      )}
    </main>
  );
}
