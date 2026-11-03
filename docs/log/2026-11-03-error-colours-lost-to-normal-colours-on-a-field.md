# 2026-11-03: Contact form fields stayed grey when invalid

- **Area:** frontend
- **Author:** Daveoski + agent
- **Symptom:** on `/contact`, after "Send message" with empty fields, the error
  text showed but the fields kept the grey border and white background. In
  Chrome, `getComputedStyle` gave `rgb(213, 223, 235)` for the border and
  `rgb(255, 255, 255)` for the background of a field with `aria-invalid="true"`.
  The jsdom tests passed, because jsdom applies no Tailwind CSS.
- **Cause:** the field's classes held both `border-input-line bg-white` and,
  when invalid, `border-[#DC2626] bg-[#FEF2F2]`. Two Tailwind utilities that set
  the same property are applied in the order they appear in the generated
  stylesheet, not the order in `className`, and the theme colours came later.
  The app's `TextField` does not hit this: its base look is the component class
  `.mo-in`, which any utility overrides.
- **Fix / workaround:** `controlClass(invalid)` in `ContactForm.tsx` puts only
  one state's colours on the element. Checked again in Chrome: `rgb(220, 38, 38)`
  and `rgb(254, 242, 242)` on invalid fields, grey on the valid one. A test now
  checks that an invalid field has the error classes and not the normal ones.
  When a component switches a colour by state, swap the class; do not add a
  second utility for the same property.
- **Status:** resolved
- **Refs:** #344; `frontend/src/features/marketing/ContactForm.tsx`.
