import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { containTab, useDialogFocusTrap } from './dialogFocusTrap';

function Dialog({
  triggerRef,
  onClose,
  label = 'test dialog',
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(true, dialogRef, triggerRef);
  return (
    <div ref={dialogRef} role="dialog" aria-label={label} onKeyDown={containTab}>
      <button onClick={onClose}>cancel</button>
      <input aria-label="name" />
      <button>confirm</button>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)}>
        open dialog
      </button>
      <button>background button</button>
      {open && <Dialog triggerRef={triggerRef} onClose={() => setOpen(false)} />}
    </>
  );
}

function NestedHarness() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const outerDialogRef = useRef<HTMLDivElement>(null);
  const innerTriggerRef = useRef<HTMLButtonElement>(null);
  const innerDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(outerOpen, outerDialogRef, triggerRef);
  useDialogFocusTrap(innerOpen, innerDialogRef, innerTriggerRef);
  return (
    <>
      <button ref={triggerRef} onClick={() => setOuterOpen(true)}>
        open outer
      </button>
      {outerOpen && (
        <div ref={outerDialogRef} role="dialog" aria-label="outer">
          <button
            ref={innerTriggerRef}
            onClick={() => setInnerOpen(true)}
          >
            open inner
          </button>
          <button>outer other</button>
        </div>
      )}
      {innerOpen && (
        <div ref={innerDialogRef} role="dialog" aria-label="inner">
          <button onClick={() => setInnerOpen(false)}>inner cancel</button>
          <button>inner confirm</button>
        </div>
      )}
    </>
  );
}

function pressTab(shiftKey = false) {
  fireEvent.keyDown(window, { key: 'Tab', shiftKey });
}

describe('useDialogFocusTrap', () => {
  afterEach(cleanup);

  it('moves focus to the first control on open', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    expect(within(dialog).getByRole('button', { name: 'cancel' })).toHaveFocus();
  });

  it('wraps Tab from the last control back to the first', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    const confirm = within(dialog).getByRole('button', { name: 'confirm' });
    confirm.focus();
    pressTab();
    expect(within(dialog).getByRole('button', { name: 'cancel' })).toHaveFocus();
  });

  it('wraps shift+tab from the first control back to the last', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    const cancel = within(dialog).getByRole('button', { name: 'cancel' });
    expect(cancel).toHaveFocus();
    pressTab(true);
    expect(within(dialog).getByRole('button', { name: 'confirm' })).toHaveFocus();
  });

  it('never lets tab reach the background', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    const background = screen.getByRole('button', { name: 'background button' });
    for (let i = 0; i < 10; i++) pressTab();
    expect(background).not.toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('returns focus to the trigger on close', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'open dialog' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'cancel' }));
    expect(trigger).toHaveFocus();
  });

  it('yields tab to a nested dialog instead of stealing it back', () => {
    render(<NestedHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'open outer' }));
    fireEvent.click(screen.getByRole('button', { name: 'open inner' }));
    const inner = screen.getByRole('dialog', { name: 'inner' });
    const innerCancel = within(inner).getByRole('button', { name: 'inner cancel' });
    expect(innerCancel).toHaveFocus();
    const innerConfirm = within(inner).getByRole('button', { name: 'inner confirm' });
    innerConfirm.focus();
    pressTab();
    // wraps inside the inner dialog; the outer dialog's controls are untouched.
    expect(innerCancel).toHaveFocus();
  });
});

describe('containTab', () => {
  afterEach(cleanup);

  it('cycles tab within the element it is attached to', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'test dialog' });
    const confirm = within(dialog).getByRole('button', { name: 'confirm' });
    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(within(dialog).getByRole('button', { name: 'cancel' })).toHaveFocus();
  });
});
