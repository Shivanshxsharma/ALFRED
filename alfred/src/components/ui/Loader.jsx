import React from 'react';
export default function Loader() {
  return (
    <>
      <style>{`
        .loader {
          width: 70px;
          height: 26px;
          background: #475569;
          border-radius: 50px;
          --c: no-repeat radial-gradient(farthest-side, #fff 92%, #0000);
          --s: 18px 18px;
          -webkit-mask:
            var(--c) left 4px top 50%,
            var(--c) center,
            var(--c) right 4px top 50%,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: l1 1.5s infinite;
        }
        @keyframes l1 {
          0%     { -webkit-mask-size: 0 0,      0 0,      0 0,      auto }
          16.67% { -webkit-mask-size: 18px 18px, 0 0,      0 0,      auto }
          33.33% { -webkit-mask-size: 18px 18px, 18px 18px, 0 0,      auto }
          50%    { -webkit-mask-size: 18px 18px, 18px 18px, 18px 18px, auto }
          66.67% { -webkit-mask-size: 0 0,      18px 18px, 18px 18px, auto }
          83.33% { -webkit-mask-size: 0 0,      0 0,       18px 18px, auto }
          100%   { -webkit-mask-size: 0 0,      0 0,       0 0,       auto }
        }
      `}</style>
      <div className="loader" />
    </>
  )
}