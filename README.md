# dialog-focus-trap

accessible dialog focus management for react. one hook gives you the three things every modal needs: focus moves inside on open, tab cycles within the dialog (the background is not tab-reachable), and focus returns to the trigger on close.

it also handles the case most focus traps get wrong: nested dialogs. when a second dialog opens on top, tab yields to the topmost one instead of fighting it.

## where it came from

extracted from missent, a private email app i'm building. this is the exact focus management it uses across its dialogs, tests included.

## use

it's one file. copy dialogFocusTrap.ts into your project, or install it:

```tsx
import { useRef } from 'react';
import { useDialogFocusTrap } from './dialogFocusTrap';

function ConfirmDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useDialogFocusTrap(true, dialogRef, triggerRef);

  return (
    <div ref={dialogRef} role="dialog" aria-label="confirm">
      <button onClick={onClose}>cancel</button>
      <button>confirm</button>
    </div>
  );
}
```

pass the trigger's ref and focus returns to it when the dialog closes. if you don't have one, the hook falls back to whatever had focus before the dialog opened.

the hook also exports two helpers:

- `getDialogFocusableElements(root)` lists the tab-reachable elements inside a container, in document order, skipping hidden and disabled ones.
- `containTab` is an onKeyDown handler you can attach to the dialog element itself for the same tab cycling.

## test

```sh
npm install
npm test
```

## license

mit, see LICENSE.
