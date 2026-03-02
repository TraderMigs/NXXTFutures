import { useState, useEffect } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt,     setShowPrompt]     = useState(false);
  const [isIOS,          setIsIOS]          = useState(false);
  const [isInstalled,    setIsInstalled]    = useState(false);
  const [dismissed,      setDismissed]      = useState(false);

  useEffect(() => {
    // Already installed as PWA?
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true); return;
    }
    // Previously dismissed?
    if (localStorage.getItem('nxxt-pwa-dismissed')) {
      setDismissed(true); return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after 3s
      setTimeout(() => setShowPrompt(true), 3000);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setShowPrompt(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('nxxt-pwa-dismissed', '1');
    setDismissed(true);
  };

  if (!showPrompt || isInstalled || dismissed) return null;

  return (
    <>
      {/* Backdrop blur on mobile */}
      <div className="fixed inset-0 bg-black/40 z-[9998] md:hidden" onClick={handleDismiss} />

      {/* Prompt card — slides up from bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
        style={{ animation: 'slideUpPrompt 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <style>{`
          @keyframes slideUpPrompt {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div className="bg-[#111318] border border-amber-500/30 rounded-2xl p-5 shadow-2xl shadow-black/50">
          {/* Close */}
          <button onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 text-gray-600 hover:text-gray-300 transition-all">
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-amber-400 text-lg">NF</span>
            </div>
            <div>
              <div className="font-display font-bold text-white text-sm">Install NXXT Futures</div>
              <div className="text-[11px] text-gray-500">Add to home screen for instant access</div>
            </div>
          </div>

          {isIOS ? (
            // iOS instructions
            <div className="space-y-2 mb-4">
              <p className="text-xs text-gray-400">To install on your iPhone or iPad:</p>
              <div className="space-y-2">
                {[
                  { icon: <Share className="w-3.5 h-3.5" />, text: 'Tap the Share button in Safari' },
                  { icon: <Plus className="w-3.5 h-3.5" />,  text: 'Tap "Add to Home Screen"' },
                  { icon: <Download className="w-3.5 h-3.5" />, text: 'Tap "Add" to confirm' },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128]">
                    <div className="text-amber-400">{icon}</div>
                    <span className="text-xs text-gray-300">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Android / Chrome install
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-3">Get instant access, offline support, and a native app feel — no App Store needed.</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {['⚡ Fast', '📶 Offline', '🔔 Alerts'].map(f => (
                  <div key={f} className="text-center py-2 bg-[#0A0B0D] rounded-xl border border-[#1E2128] text-xs text-gray-400">{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleDismiss}
              className="flex-1 py-2.5 bg-[#0A0B0D] border border-[#1E2128] rounded-xl text-xs text-gray-500 hover:text-gray-300 transition-all">
              Not now
            </button>
            {!isIOS && (
              <button onClick={handleInstall}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-display font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Install
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
