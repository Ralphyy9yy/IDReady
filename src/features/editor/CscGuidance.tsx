export function CscGuidance({ digitalTag = false }: { digitalTag?: boolean }) {
  return (
    <aside className="notice csc-guidance" aria-label="CSC photo guidance">
      <strong>CSC: dimensions only — not a compliance check</strong>
      <p>35 × 45 mm · White background · Physical handwritten name tag</p>
      <details>
        <summary>Review CSC photo requirements</summary>
        <ul>
          <li>
            Four identical, colored photos taken within the last three months, on a white background
            and good-quality photo paper.
          </li>
          <li>
            Shoulder-up framing, with the head and face occupying at least 80% of the picture. Both
            ears must be visible.
          </li>
          <li>
            Face the camera directly, with a neutral expression and both eyes open. No eyeglasses,
            colored contact lenses, or accessories covering facial features; facial features must
            not be computer-enhanced.
          </li>
          <li>
            Use a physical handwritten (not computer-generated) name tag showing your signature
            above your printed full name, including middle initial and name extension if applicable.
            Position it approximately 1 inch / 2.54 cm below the chin and keep it visible in the
            crop.
          </li>
        </ul>
      </details>
      <p>
        <strong>
          {digitalTag
            ? 'A typed name tag is enabled. It does not meet this handwritten-tag requirement.'
            : 'A typed overlay is not a substitute for the photographed handwritten name tag.'}
        </strong>{' '}
        Check the current instructions for your specific CSC application. IDReady does not verify
        these requirements or guarantee acceptance.
      </p>
    </aside>
  )
}
