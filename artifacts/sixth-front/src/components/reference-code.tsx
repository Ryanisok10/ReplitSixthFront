import { useState } from 'react';

export function ReferenceCode({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-[15px] font-medium text-muted hover:text-tomato underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tomato focus-visible:ring-offset-2 rounded"
          data-testid="button-toggle-reference-code"
        >
          Have a reference code?
        </button>
      ) : (
        <label className="block animate-rise">
          <span className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Reference code</span>
          <input
            type="text"
            name="referenceCode"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="w-full h-[52px] px-4 rounded-lg border border-line bg-paper/60 focus:bg-white focus:border-tomato focus:ring-2 focus:ring-tomato/20 outline-none transition-all text-[15px]"
            data-testid="input-reference-code"
          />
        </label>
      )}
    </div>
  );
}