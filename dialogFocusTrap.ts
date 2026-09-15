// Focus management for modal dialogs: initial focus on open, Tab cycling
// while open (background is not Tab-reachable), and focus restoration on
// close. The Tab listener is window-level and Tab-only, so it composes with
// your own Escape handling without interfering.
import { useEffect, useRef } from 'react';
import type * as React from 'react';

export function getDialogFocusableElements(root: HTMLElement): HTMLElement[] {
  // Document order via '*' + matches: some jsdom versions group
  // comma-separated ':not(:disabled)' selectors by selector instead of
  // document order, which would reorder Tab cycling in tests. Real browsers
  // already return document order; this keeps both identical.
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('*')).filter((el) =>
    el.matches(
      'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ),
  );
  return candidates.filter((el) => {
    if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let node: HTMLElement | null = el; node && node !== root; node = node.parentElement) {
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
    return true;
  });
}

export function containTab(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const items = getDialogFocusableElements(e.currentTarget);
  const index = items.indexOf(document.activeElement as HTMLElement);
  e.preventDefault();
  if (items.length) items[(index + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
}

export function useDialogFocusTrap(
  isOpen: boolean,
  dialogRef: { readonly current: HTMLElement | null },
  triggerRef?: { readonly current: HTMLElement | null },
) {
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    // Capture the opener before moving focus: explicit trigger first,
    // otherwise whatever had focus (keyboard trigger or mouse-focusable
    // control). Null when focus is already inside the dialog or on body.
    const explicit = triggerRef?.current;
    const active = document.activeElement as HTMLElement | null;
    openerRef.current =
      explicit && explicit.isConnected
        ? explicit
        : active && active.isConnected && active !== document.body
          ? active
          : null;
    // Initial focus: first control (the cancel/close button in every
    // confirm dialog), else the titled heading (tabIndex -1), if present.
    const root = dialogRef.current;
    if (root) {
      const items = getDialogFocusableElements(root);
      const heading = root.querySelector<HTMLElement>('[tabindex="-1"]');
      (items[0] ?? heading ?? root).focus();
    }
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const el = dialogRef.current;
      if (!el) return;
      // Yield when focus is inside a different dialog: that surface owns
      // Tab (newest dialog is topmost). Only force focus back when focus is outside all
      // dialogs or inside this one.
      const overlay = (document.activeElement as HTMLElement | null)?.closest?.('[role="dialog"]');
      if (overlay && overlay !== el) return;
      const items = getDialogFocusableElements(el);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (!current || !el.contains(current)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTab);
    return () => {
      window.removeEventListener('keydown', handleTab);
      const opener = openerRef.current ?? triggerRef?.current;
      if (opener && opener.isConnected) opener.focus();
    };
  }, [isOpen, dialogRef, triggerRef]);
}
