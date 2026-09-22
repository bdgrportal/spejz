// Minimalista vonalas ikonok (SVG). A logó a bevásárlókosár.
const w = (p, extra = '') =>
  `<svg viewBox="0 0 24 24" ${extra} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

export const ICON = {
  // bevásárlókosár - Spejz logó
  basket: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M8.5 8 11 3M15.5 8 13 3"/>
    <path d="M3 8h18l-1.6 10.2A2.5 2.5 0 0 1 16.9 20H7.1a2.5 2.5 0 0 1-2.5-1.8Z"/>
    <path d="M9.5 12.5v3.5M14.5 12.5v3.5"/>
  </svg>`,
  list: w('<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  cart: w('<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h2.2l2.3 11.2A2 2 0 0 0 8.5 16h9.2a2 2 0 0 0 2-1.6L21.5 7H5"/>'),
  box: w('<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5Z"/><path d="M3 8.5 12 13l9-4.5M12 13v7"/>'),
  wallet: w('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1"/><path d="M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2.5"/><path d="M21 9.5h-4a2.5 2.5 0 0 0 0 5h4Z"/>'),
  cog: w('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15a2 2 0 1 1 0-4 1.6 1.6 0 0 0 1.7-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3a2 2 0 1 1 4 0 1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10a2 2 0 1 1 0 4Z"/>'),
  check: w('<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>', 'stroke-width="3"'),
  trash: w('<path d="M4 7h16M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7"/><path d="M6.5 7l.8 12.1A2 2 0 0 0 9.3 21h5.4a2 2 0 0 0 2-1.9L17.5 7"/>'),
  pencil: w('<path d="M4 20h4L20 8a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="M14.5 5.5 18.5 9.5"/>'),
  plus: w('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.6"'),
  copy: w('<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>'),
  back: w('<path d="M15 5l-7 7 7 7"/>')
};
