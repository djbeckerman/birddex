import { useState } from 'react';
import './CustomCalendar.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  maxDate?: string; // YYYY-MM-DD (defaults to today)
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function CustomCalendar({ value, onChange, maxDate }: CustomCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxD = maxDate ? parseLocalDate(maxDate) : today;

  const selected = value ? parseLocalDate(value) : null;

  const [viewYear, setViewYear] = useState(() =>
    selected ? selected.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState(() =>
    selected ? selected.getMonth() : today.getMonth()
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else { setViewMonth((m) => m - 1); }
  }

  function nextMonth() {
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    // Don't navigate past the month containing maxDate
    if (nextDate > maxD) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else { setViewMonth((m) => m + 1); }
  }

  function handleDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d > maxD) return;
    onChange(toYMD(d));
  }

  function isSelected(day: number): boolean {
    if (!selected) return false;
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }

  function isToday(day: number): boolean {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }

  function isFuture(day: number): boolean {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    return d > maxD;
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isNextDisabled = new Date(viewYear, viewMonth + 1, 1) > maxD;

  return (
    <div className="cal">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth} type="button" aria-label="Previous month">
          ‹
        </button>
        <span className="cal-month-label">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          className="cal-nav-btn"
          onClick={nextMonth}
          type="button"
          aria-label="Next month"
          disabled={isNextDisabled}
        >
          ›
        </button>
      </div>

      <div className="cal-grid">
        {DAY_NAMES.map((d) => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="cal-day cal-day--empty" />;
          const future = isFuture(day);
          const sel = isSelected(day);
          const tod = isToday(day);
          return (
            <button
              key={i}
              type="button"
              className={[
                'cal-day',
                sel ? 'cal-day--selected' : '',
                tod && !sel ? 'cal-day--today' : '',
                future ? 'cal-day--future' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleDay(day)}
              disabled={future}
              aria-pressed={sel}
              aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
