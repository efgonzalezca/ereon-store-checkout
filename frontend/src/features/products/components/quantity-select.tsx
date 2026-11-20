import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

interface QuantitySelectProps {
  value: number;
  max: number;
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
}

export function QuantitySelect({
  value,
  max,
  disabled = false,
  label,
  onChange,
}: QuantitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeValue, setActiveValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const valueId = `${baseId}-value`;
  const options = max > 0 ? Array.from({ length: max }, (_, i) => i + 1) : [0];

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.focus();
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [isOpen]);

  const open = () => {
    setActiveValue(value);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const select = (next: number) => {
    onChange(next);
    close();
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = options.indexOf(activeValue);
    switch (event.key) {
      case 'ArrowDown':
        setActiveValue(options[Math.min(index + 1, options.length - 1)]);
        break;
      case 'ArrowUp':
        setActiveValue(options[Math.max(index - 1, 0)]);
        break;
      case 'Enter':
      case ' ':
        select(activeValue);
        break;
      case 'Escape':
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="quantity-select" ref={containerRef}>
      <span id={labelId} className="quantity-select__label">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="quantity-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${labelId} ${valueId}`}
        disabled={disabled}
        onClick={() => (isOpen ? close() : open())}
      >
        <span id={valueId}>{value}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </button>
      {isOpen && (
        <ul
          ref={listRef}
          className="quantity-select__list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${baseId}-option-${activeValue}`}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option) => (
            <li
              key={option}
              id={`${baseId}-option-${option}`}
              role="option"
              aria-selected={option === value}
              className={
                option === activeValue
                  ? 'quantity-select__option quantity-select__option--active'
                  : 'quantity-select__option'
              }
              onClick={() => select(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
