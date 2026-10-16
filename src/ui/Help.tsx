import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Hover, focus and tap all reveal the same detail; Escape dismisses it. */
export function Help({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const reveal = () => {
    clearTimeout(timer.current);
    if (open) return;
    const rect = trigger.current!.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 32);
    setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: Math.min(rect.bottom + 8, window.innerHeight - 100) });
    setOpen(true);
  };
  const hideSoon = () => { timer.current = setTimeout(() => setOpen(false), 140); };
  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const height = Math.min(panel.current.scrollHeight + 2, window.innerHeight - 32);
    const top = rect.bottom + 8 + height <= window.innerHeight - 16 ? rect.bottom + 8 : Math.max(16, rect.top - height - 8);
    setPosition((current) => current.top === top ? current : { ...current, top });
    if (focusRequested.current) { focusRequested.current = false; panel.current.focus({ preventScroll: true }); }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (panel.current?.contains(document.activeElement)) trigger.current?.focus(); setOpen(false); } };
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false); };
    const move = () => setOpen(false);
    const scroll = (event: Event) => {
      if (panel.current?.contains(event.target as Node) || !trigger.current || !panel.current) return;
      // Keyboard focus may scroll the trigger into view after the panel opens.
      // Keep its anchored position instead of hiding the newly focused panel.
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(340, window.innerWidth - 32);
      const height = Math.min(panel.current.scrollHeight + 2, window.innerHeight - 32);
      const top = rect.bottom + 8 + height <= window.innerHeight - 16 ? rect.bottom + 8 : Math.max(16, rect.top - height - 8);
      setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top });
    };
    document.addEventListener('keydown', dismiss, true);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', move);
    document.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('keydown', dismiss, true); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', move); document.removeEventListener('scroll', scroll, true); };
  }, [open]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return <>
    <button type="button" className="help-trigger" ref={trigger} aria-label={`About ${label}`} aria-keyshortcuts="ArrowDown" aria-expanded={open} aria-describedby={mounted ? id : undefined} onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); if (open) panel.current?.focus({ preventScroll: true }); else { focusRequested.current = true; reveal(); } } }} onMouseEnter={reveal} onMouseLeave={hideSoon} onFocus={reveal} onBlur={hideSoon} onClick={reveal}><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 7a3 3 0 0 1 6 0c0 2-3 2-3 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="10" cy="14.5" r="1" fill="currentColor" /></svg></button>
    {mounted && createPortal(<div id={id} ref={panel} role="tooltip" hidden={!open} tabIndex={open ? 0 : -1} className="help-panel" style={{ left: position.left, top: position.top, maxHeight: `calc(100dvh - ${position.top + 16}px)` }} onFocus={() => clearTimeout(timer.current)} onBlur={hideSoon} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={hideSoon}>
      <strong>{label}</strong><div>{children}</div>
      <p className="help-keyboard-hint">↓ Focus details · Esc Close</p>
    </div>, trigger.current?.closest('dialog') ?? document.body)}
  </>;
}
