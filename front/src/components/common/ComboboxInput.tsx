import { useState } from 'react';
import {
  Combobox,
  ComboboxInput as HeadlessComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';

export interface ComboboxInputProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
}

export function ComboboxInput({
  options,
  value,
  onChange,
  placeholder,
  label = 'Select an option',
  id,
  className,
  inputClassName,
}: ComboboxInputProps) {
  const [query, setQuery] = useState('');

  const filtered =
    query === ''
      ? options
      : options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  const showAdd =
    query !== '' &&
    !options.some((o) => o.toLowerCase() === query.toLowerCase());

  return (
    <Combobox
      value={value}
      onChange={(v: string) => {
        onChange(v);
        setQuery('');
      }}
    >
      <div className={className ?? ''}>
        <label className="sr-only" htmlFor={id}>
          {label}
        </label>

        <HeadlessComboboxInput
            id={id}
            aria-label={label}
            className={inputClassName ?? "w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-400 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-wine-400"}
            placeholder={placeholder}
            displayValue={(v: string) => v}
            onChange={(e) => {
              // Propagate every keystroke immediately so the controlled value
              // is always up-to-date before form submission reads state.
              setQuery(e.target.value);
              onChange(e.target.value);
            }}
            onBlur={() => {
              // Reset the display query so the input shows the committed value
              // via displayValue. The parent state is already current from onChange.
              setQuery('');
            }}
          />

          <ComboboxOptions
            anchor="bottom start"
            className="z-50 [--anchor-gap:4px] max-h-60 w-[var(--input-width)] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg empty:hidden"
          >
            {filtered.slice(0, 10).map((option) => (
              <ComboboxOption
                key={option}
                value={option}
                className="cursor-pointer select-none px-3 py-2 text-slate-800 data-[focus]:bg-wine-50"
              >
                {option}
              </ComboboxOption>
            ))}

            {showAdd && (
              <ComboboxOption
                value={query}
                className="cursor-pointer select-none px-3 py-2 italic text-slate-500 data-[focus]:bg-wine-50"
              >
                Add "{query}"
              </ComboboxOption>
            )}

            {filtered.length === 0 && !showAdd && (
              <div className="px-3 py-2 text-slate-400">No results</div>
            )}
          </ComboboxOptions>
      </div>
    </Combobox>
  );
}
