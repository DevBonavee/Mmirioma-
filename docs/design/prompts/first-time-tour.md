# First-time tour design brief

Owner request: 4 November 2026. Design proposal:
[first-time-tour.md](../first-time-tour.md). Implementation authorized by the
owner on 4 November 2026 under an explicit override of the design gate.

Design a responsive, optional first-time tour for MmiriOma's existing customer,
Keke rider and tanker-driver apps. Reuse the approved design system and the
exact routes, copy, account gates and workflow described in the proposal.

Show welcome, each customer and partner step, dismissal and replay. Use clear
progress, Back/Next/Skip/Finish controls and concise role-specific explanations.
Make the guide accessible by keyboard and screen reader, usable at 320 px and
200% zoom, and respectful of reduced motion. Desktop uses up to 720 px;
mobile keeps actions reachable within safe-area padding. Avoid tooltips tied
to fragile screen coordinates, forced transitions and decorative distractions.

Never invent prices, coverage, earnings, approval, arrival times, tracking,
water-quality claims or confirmation. Explain existing features without
submitting an order, accepting a job or changing availability. New accounts
must retain their existing phone-verification step. Simulated data, if shown
in design references, must be labelled. No API changes or new dependencies.
