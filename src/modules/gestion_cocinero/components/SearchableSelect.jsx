import { useState, useRef, useEffect, useMemo } from 'react';

export default function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Buscar...", 
  disabled = false,
  formatOption = (opt) => opt
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(opt => formatOption(opt).toLowerCase().includes(q));
  }, [options, search, formatOption]);

  const handleSelect = (opt) => {
    onChange(opt);
    setSearch('');
    setIsOpen(false);
  };

  const selectedDisplay = value ? formatOption(value) : '';

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        className={`flex items-center justify-between h-11 w-full rounded-lg border px-3 transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-[var(--brand)] focus-within:border-[var(--brand)]'}`}
        style={{ borderColor: 'var(--line)', backgroundColor: disabled ? 'var(--panel-soft)' : 'var(--panel)' }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-[var(--text)]' : 'text-gray-400'}>
          {value ? selectedDisplay : placeholder}
        </span>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 rounded-xl shadow-lg border overflow-hidden animate-in fade-in slide-in-from-top-2" style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel)' }}>
          <div className="p-2 border-b" style={{ borderColor: 'var(--line)' }}>
            <input
              type="text"
              autoFocus
              className="w-full rounded-lg border h-9 px-3 text-sm focus:outline-none focus:border-[var(--brand)]"
              style={{ borderColor: 'var(--line)', backgroundColor: 'var(--panel-soft)' }}
              placeholder="Escribe para buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, i) => (
                <div
                  key={i}
                  className={`px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors hover:bg-gray-100 hover:text-black dark:hover:bg-gray-700 dark:hover:text-white ${value === opt ? 'font-bold text-[var(--brand)]' : ''}`}
                  onClick={() => handleSelect(opt)}
                >
                  {formatOption(opt)}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-sm" style={{ color: 'var(--muted)' }}>
                No se encontraron resultados
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
