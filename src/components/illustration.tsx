/**
 * A simple geometric illustration (chat bubbles over an open book) drawn in the
 * app's own colours. Used on the admin login screen.
 */
export function ChatBookIllustration({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} role="img" aria-label="Chat bubbles above an open book">
      <ellipse cx="180" cy="268" rx="132" ry="14" fill="rgb(92 64 40 / 0.18)" />
      {/* open book */}
      <path d="M52 214c44-14 88-12 128 6v40c-40-18-84-20-128-6z" fill="#fffdf9" />
      <path d="M308 214c-44-14-88-12-128 6v40c40-18 84-20 128-6z" fill="#faf6f0" />
      <path d="M180 220v40" fill="none" stroke="#dcd2c5" strokeWidth="2" />
      <path fill="none" d="M72 226c30-8 62-7 92 3M72 238c30-8 62-7 92 3M196 229c30-10 62-11 92-3M196 241c30-10 62-11 92-3" stroke="#e9e1d6" strokeWidth="3" strokeLinecap="round" />
      {/* student bubble */}
      <rect x="40" y="46" width="168" height="62" rx="20" fill="#fffdf9" />
      <path d="M70 108l-6 18 22-18z" fill="#fffdf9" />
      <rect x="62" y="66" width="104" height="8" rx="4" fill="#dcd2c5" />
      <rect x="62" y="82" width="72" height="8" rx="4" fill="#e9e1d6" />
      {/* bot bubble */}
      <rect x="128" y="124" width="196" height="74" rx="22" fill="#24201c" />
      <path d="M296 198l8 18-26-18z" fill="#24201c" />
      <rect x="150" y="146" width="120" height="8" rx="4" fill="#fce8df" />
      <rect x="150" y="162" width="148" height="8" rx="4" fill="rgb(252 232 223 / 0.55)" />
      <rect x="150" y="178" width="84" height="8" rx="4" fill="rgb(252 232 223 / 0.35)" />
      {/* spark */}
      <circle cx="300" cy="72" r="20" fill="#fffdf9" fillOpacity="0.22" />
      <path d="M300 58v28M286 72h28" fill="none" stroke="#fffdf9" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
