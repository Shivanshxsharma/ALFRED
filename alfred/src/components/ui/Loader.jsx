import React from 'react';
export default function Loader() {
  return (
    <div className="flex items-center justify-start">
      <div className="loader"></div>
      
      <style jsx>{`
        .loader {
          width: 40px;
          aspect-ratio: 1;
          --c: linear-gradient(#fff 0 0);
          --m: radial-gradient(farthest-side, #fff 92%, #0000);
          background: 
            var(--m) center / 12px 12px,
            var(--c) left 50% top -20px / 8px 16px, 
            var(--c) left 50% bottom -20px / 8px 16px, 
            var(--c) top 50% left -20px / 16px 8px, 
            var(--c) top 50% right -20px / 16px 8px;
          background-repeat: no-repeat;
          animation: 
            loader-1 1s infinite,
            loader-2 1s infinite;
        }
        
        @keyframes loader-1 {
          30%,
          70% {
            background-position: 
              center,
              left 50% top calc(50% - 8px),
              left 50% bottom calc(50% - 8px),
              top 50% left calc(50% - 8px),
              top 50% right calc(50% - 8px);
          }
        }
        
        @keyframes loader-2 {
          0%, 40% {
            transform: rotate(0);
          }
          60%, 100% {
            transform: rotate(90deg);
          }
        }
      `}</style>
    </div>
  );
}