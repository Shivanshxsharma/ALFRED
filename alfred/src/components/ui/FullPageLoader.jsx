export default function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="loader" />
      <style>{`
        .loader {
          width: 72px;
          height: 72px;
          background: #6d28d9; /* violet-700 */
          --c: no-repeat linear-gradient(#000 0 0);
          --s: 27px 27px;
          -webkit-mask:
            var(--c) left   6px top    6px,
            var(--c) right  6px top    6px,
            var(--c) right  6px bottom 6px,
            var(--c) left   6px bottom 6px,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          animation: l5 1.5s infinite;
        }
        @keyframes l5 {
          0%    { -webkit-mask-size: 0    0  , 0    0  , 0    0  , 0    0  , auto }
          12.5% { -webkit-mask-size: var(--s), 0    0  , 0    0  , 0    0  , auto }
          25%   { -webkit-mask-size: var(--s), var(--s), 0    0  , 0    0  , auto }
          37.5% { -webkit-mask-size: var(--s), var(--s), var(--s), 0    0  , auto }
          50%   { -webkit-mask-size: var(--s), var(--s), var(--s), var(--s), auto }
          62.5% { -webkit-mask-size: 0    0  , var(--s), var(--s), var(--s), auto }
          75%   { -webkit-mask-size: 0    0  , 0    0  , var(--s), var(--s), auto }
          87.5% { -webkit-mask-size: 0    0  , 0    0  , 0    0  , var(--s), auto }
          100%  { -webkit-mask-size: 0    0  , 0    0  , 0    0  , 0    0  , auto }
        }
      `}</style>
    </div>
  );
}