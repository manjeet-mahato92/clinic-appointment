import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function ActionDropdown({ items }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="btn-sm bg-white text-ink border border-slate-200 hover:bg-slate-50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {items.map((item, index) => {
              const className = `block w-full text-left px-4 py-2 text-sm ${item.isDanger ? 'text-danger' : 'text-ink'} hover:bg-slate-100`;
              if (item.href) {
                return (
                  <Link key={index} to={item.href} target={item.target} className={className} role="menuitem" onClick={() => setIsOpen(false)}>
                    {item.label}
                  </Link>
                );
              }
              return (
                <button key={index} onClick={() => { item.onClick(); setIsOpen(false); }} className={className} role="menuitem">
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}