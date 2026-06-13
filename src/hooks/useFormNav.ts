// ============================================================================
// useFormNav — keyboard navigation for data-entry forms.
//   • Tab / Enter / ArrowDown → move focus to the NEXT field (forward)
//   • ArrowUp                 → move focus to the PREVIOUS field
//   • ArrowLeft / ArrowRight  → move between fields horizontally, direction by
//                               layout (RTL: Left = next, Right = previous).
//   • Shift (tapped alone)    → move focus to the PREVIOUS field (backward)
// Backward is a *bare Shift tap* — NOT Shift+Tab and NOT Shift+Enter (those are
// suppressed). Holding Shift for a combo or a capital letter never navigates.
// Arrows keep their native meaning in textareas / date / number inputs and in
// dropdowns (SearchSelect stops their propagation). Left/Right only jump when
// the caret sits at the field's edge (or the text is fully selected), so the
// arrows still move the cursor within a field while you're editing it.
//
// Spread the returned handlers onto a container element:
//   const formNav = useFormNav()
//   <div {...formNav}>…fields…</div>
// ============================================================================
import { useCallback, useRef } from 'react'

const FOCUSABLE = 'input, select, textarea, button, [tabindex]'

function focusablesIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.tabIndex !== -1 &&
      el.offsetParent !== null, // visible
  )
}

/** Focus the field `dir` steps from `target`. Returns true if it moved. */
function moveFocus(container: HTMLElement, target: HTMLElement, dir: number): boolean {
  const items = focusablesIn(container)
  const idx = items.indexOf(target)
  if (idx === -1) return false
  const next = items[idx + dir]
  if (!next) return false
  next.focus()
  const ni = next as HTMLInputElement
  if (ni.tagName === 'INPUT' && typeof ni.select === 'function') {
    try {
      ni.select()
    } catch {
      /* number/date inputs may not support select() */
    }
  }
  return true
}

export function useFormNav() {
  // Tracks whether Shift is currently held with no other key pressed since
  // (i.e. a potential "tap"). Any other key cancels it (combo / typing).
  const shift = useRef({ down: false, alone: false })

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Shift') {
      if (!shift.current.down) {
        shift.current.down = true
        shift.current.alone = true
      }
      return
    }
    // A non-Shift key means any held Shift is part of a combo / typing.
    shift.current.alone = false

    const isEnter = e.key === 'Enter'
    const isTab = e.key === 'Tab'
    const isDown = e.key === 'ArrowDown'
    const isUp = e.key === 'ArrowUp'
    const isLeft = e.key === 'ArrowLeft'
    const isRight = e.key === 'ArrowRight'
    if (!isEnter && !isTab && !isDown && !isUp && !isLeft && !isRight) return

    const target = e.target as HTMLElement
    const tag = target.tagName
    const type = (target as HTMLInputElement).type

    // Shift+Tab / Shift+Enter must NOT navigate (backward is a bare Shift tap).
    if ((isEnter || isTab) && e.shiftKey) {
      if (isTab) e.preventDefault() // suppress the native back-tab too
      return
    }

    // Enter keeps its native meaning inside a textarea / on a button.
    if (isEnter && (tag === 'TEXTAREA' || tag === 'BUTTON' || type === 'submit')) return

    // Arrows keep their native meaning in textareas / date / number spinners.
    if ((isDown || isUp) && (tag === 'TEXTAREA' || type === 'date' || type === 'number')) return

    // Left / Right: move between fields, but only at the caret boundary so the
    // arrows still position the cursor while editing. Direction follows the
    // layout — in RTL, Left advances and Right goes back.
    if (isLeft || isRight) {
      // Let modifier combos do their native thing (select / word-jump).
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
      // Textareas and date inputs keep their native left/right behaviour.
      if (tag === 'TEXTAREA' || type === 'date') return
      const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
      const forward = rtl ? isLeft : isRight
      if (tag === 'INPUT') {
        const el = target as HTMLInputElement
        let atBoundary = true
        try {
          const s = el.selectionStart
          const en = el.selectionEnd
          const len = el.value.length
          if (s !== null && en !== null) {
            const fullySelected = s === 0 && en === len
            atBoundary = fullySelected || (forward ? s === len && en === len : s === 0 && en === 0)
          }
        } catch {
          atBoundary = true // selection API not supported → treat as edge
        }
        if (!atBoundary) return
      }
      const moved = moveFocus(e.currentTarget, target, forward ? 1 : -1)
      if (moved) e.preventDefault()
      return
    }

    const moved = moveFocus(e.currentTarget, target, isUp ? -1 : 1)
    if (moved || isEnter) e.preventDefault()
  }, [])

  const onKeyUp = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Shift') return
    const tapped = shift.current.down && shift.current.alone
    shift.current.down = false
    shift.current.alone = false
    if (!tapped) return
    // Backward: move from the currently focused field to the previous one.
    const active = document.activeElement as HTMLElement | null
    if (active) moveFocus(e.currentTarget, active, -1)
  }, [])

  return { onKeyDown, onKeyUp }
}
