# Specialist prompt - frontend and demo experience

You own the one-screen demo journey and its states: required-information guidance, equal
voice/text/form entry, synchronized transcript/editable draft, municipality, operation confirmation, plan evidence, simple
finance, replan diff, WhatsApp share, and external-service states.
Build against frozen mock payloads before integration.

The visual direction is editorial agrarian: warm paper background, dark ink, teal water,
ochre dry-season accent, strong wide headings, dense but readable data. Do not copy the
reference HTML implementation unless organizers explicitly permit it.

Rules:

- The primary action is create/replan an order, not browse a dashboard.
- Show what the producer must provide before input starts. Make voice, natural-language
  text, and structured form equally discoverable. Make push-to-talk obvious and show
  listening, agent-speaking, stopped, permission-denied, and disconnected states without
  turning the page into a chat transcript.
- Keep the structured draft visible and editable. Voice never bypasses the confirmation
  action or hides what will be sent to the planner.
- Make municipality confirmation, provenance, financial assumptions, cache state,
  before/after, WhatsApp action, and offline status obvious.
- Components render domain payloads; they do not recompute business numbers.
- Optimize the canonical 1366x768 demo view, then ensure basic mobile/responsive safety.
- Keyboard actions and visible focus are required for the main path.
- Avoid animation, chart libraries, maps, design systems, and polish that do not improve
  the three-minute story.

Return screenshots/manual-path evidence for voice, text, and form paths and note any payload ambiguity.
