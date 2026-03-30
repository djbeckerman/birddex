import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const TABS = [
  { to: '/',         label: 'My Birds',  end: true,  Icon: BookIcon      },
  { to: '/discover', label: 'Discover',  end: false, Icon: BinocularsIcon },
  { to: '/identify', label: 'Identify',  end: false, Icon: SearchIcon     },
  { to: '/friends',  label: 'Friends',   end: false, Icon: PeopleIcon     },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`}
        >
          <Icon />
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 3h6.5a4 4 0 014 4v11a3 3 0 00-3-3H4V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M18 3h-6.5a4 4 0 00-4 4v11a3 3 0 013-3h7.5V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}

function BinocularsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="13.5" r="4" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="15.5" cy="13.5" r="4" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M10.5 13.5h1M6.5 9.5V6a1 1 0 011-1h1.5M15.5 9.5V6a1 1 0 00-1-1H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M10.5 13.5c0-1.3.56-2.47 1.44-3.29" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M14.5 14.5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M8 10h4M10 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M2 19c0-3.59 2.91-6.5 6.5-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="15" cy="10" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M11 19c0-2.76 1.79-5 4-5s4 2.24 4 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}
