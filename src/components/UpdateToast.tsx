// src/components/UpdateToast.tsx
// Listens for service worker updates and shows a non-intrusive toast
// prompting the user to refresh. No manual cache clearing needed.
import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // When the SW controller changes (new SW took over), show the toast
    const handleControllerChange = () => {
      setShow(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Also check if there's already a waiting SW (e.g. user had tab open during deploy)
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      if (reg.waiting) {
        // A new SW is already waiting — activate it and show toast
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW installed, activate immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 bg-[#1A1D24] border border-amber-500/30 rounded-xl px-4 py-3 shadow-2xl shadow-black/50 min-w-[300px] max-w-[420px]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">Update available</p>
          <p className="text-gray-400 text-xs">A new version of NXXT Futures is ready.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={() => setShow(false)}
          className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-300 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
