import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface NumericStepperProps {
  id?: string;
  value: string;
  min?: number;
  max?: number;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  inputClassName?: string;
}

export const NumericStepper: React.FC<NumericStepperProps> = ({
  id,
  value,
  min = 0,
  max,
  inputRef,
  onChange,
  onCommit,
  onBlur,
  onEnter,
  onEscape,
  inputClassName = ''
}) => {
  const step = (direction: -1 | 1) => {
    const current = value === '' ? (direction === 1 ? 0 : min) : Number(value);
    const next = Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(min, current + direction));
    const nextValue = String(next);
    onChange(nextValue);
    onCommit?.(nextValue);
  };

  return (
    <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-white/20 bg-black/40 focus-within:ring-2 focus-within:ring-amber-400">
      <button
        type="button"
        aria-label="Disminuir"
        title="Disminuir"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step(-1)}
        disabled={value !== '' && Number(value) <= min}
        className="flex w-8 shrink-0 items-center justify-center border-r border-white/15 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === '' || /^\d+$/.test(nextValue)) onChange(nextValue);
        }}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onEnter?.();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onEscape?.();
          }
        }}
        className={`min-w-0 flex-1 border-0 bg-transparent text-center focus:outline-none ${inputClassName}`}
      />
      <button
        type="button"
        aria-label="Aumentar"
        title="Aumentar"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step(1)}
        disabled={max !== undefined && value !== '' && Number(value) >= max}
        className="flex w-8 shrink-0 items-center justify-center border-l border-white/15 text-zinc-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};