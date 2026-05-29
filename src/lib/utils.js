// ─── Shared utility functions ─────────────────────────────────────────────────
// Used across LiveGrid, ClubGrid, and FundraiseApp

/** Format seconds as M:SS */
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Fisher-Yates-approximate shuffle (returns a new array) */
export const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

/** Strip HTML tags and trim whitespace from any free-text field before storing */
export const sanitize = (str) => String(str ?? '').trim().replace(/<[^>]*>/g, '');
