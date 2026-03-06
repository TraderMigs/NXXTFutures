// src/components/SupportWidget.tsx
// NXXT Futures — Floating Support Widget
// Phase 2: Draggable circle, available to all users (logged in or out)
// Position remembered in localStorage. Drag detection prevents accidental opens.

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Position helpers ─────────────────────────────────────────
const WIDGET_SIZE = 56; // px  (w-14 h-14)
const STORAGE_KEY = 'nxxt_support_pos';

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getInitialPos(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        // Re-clamp in case viewport changed since last visit
        return {
          x: clamp(parsed.x, 0, window.innerWidth  - WIDGET_SIZE),
          y: clamp(parsed.y, 0, window.innerHeight - WIDGET_SIZE),
        };
      }
    }
  } catch {}
  // Default: bottom-right corner, 24px inset
  return {
    x: window.innerWidth  - WIDGET_SIZE - 24,
    y: window.innerHeight - WIDGET_SIZE - 24,
  };
}

// ─── Main component ───────────────────────────────────────────
export function SupportWidget() {
  const { profile } = useAuth();

  const [pos,      setPos]      = useState<{ x: number; y: number } | null>(null);
  const [open,     setOpen]     = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [formErr,  setFormErr]  = useState('');

  const [email,    setEmail]    = useState('');
  const [subject,  setSubject]  = useState('');
  const [category, setCategory] = useState('General');
  const [message,  setMessage]  = useState('');

  // Drag state — tracked in a ref so it never causes re-renders mid-drag
  const drag = useRef({
    active:  false,
    moved:   false,
    startMouseX: 0,
    startMouseY: 0,
    startPosX:   0,
    startPosY:   0,
  });

  // Initialise position client-side (avoids SSR mismatch)
  useEffect(() => {
    setPos(getInitialPos());
  }, []);

  // Keep email in sync with logged-in user
  useEffect(() => {
    if (profile?.email) setEmail(profile.email);
  }, [profile]);

  // Re-clamp on window resize
  useEffect(() => {
    const onResize = () => {
      setPos(prev => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, 0, window.innerWidth  - WIDGET_SIZE),
          y: clamp(prev.y, 0, window.innerHeight - WIDGET_SIZE),
        };
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ─── Drag handlers ─────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startMouseX;
    const dy = e.clientY - drag.current.startMouseY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    if (!drag.current.moved) return;
    setPos({
      x: clamp(drag.current.startPosX + dx, 0, window.innerWidth  - WIDGET_SIZE),
      y: clamp(drag.current.startPosY + dy, 0, window.innerHeight - WIDGET_SIZE),
    });
  }, []);

  const onMouseUp = useCallback((e: MouseEvent) => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup',   onMouseUp);
    if (drag.current.moved) {
      // Finished a drag — save position, don't open form
      setPos(prev => {
        if (prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    } else {
      // It was a click — open/close the form
      setOpen(o => !o);
    }
    drag.current.active = false;
    drag.current.moved  = false;
  }, [onMouseMove]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    drag.current.active      = true;
    drag.current.moved       = false;
    drag.current.startMouseX = e.clientX;
    drag.current.startMouseY = e.clientY;
    drag.current.startPosX   = pos?.x ?? 0;
    drag.current.startPosY   = pos?.y ?? 0;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
  }, [pos, onMouseMove, onMouseUp]);

  // Touch equivalents
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!drag.current.active) return;
    const touch = e.touches[0];
    const dx = touch.clientX - drag.current.startMouseX;
    const dy = touch.clientY - drag.current.startMouseY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    if (!drag.current.moved) return;
    setPos({
      x: clamp(drag.current.startPosX + dx, 0, window.innerWidth  - WIDGET_SIZE),
      y: clamp(drag.current.startPosY + dy, 0, window.innerHeight - WIDGET_SIZE),
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend',  onTouchEnd);
    if (drag.current.moved) {
      setPos(prev => {
        if (prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    } else {
      setOpen(o => !o);
    }
    drag.current.active = false;
    drag.current.moved  = false;
  }, [onTouchMove]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    drag.current.active      = true;
    drag.current.moved       = false;
    drag.current.startMouseX = touch.clientX;
    drag.current.startMouseY = touch.clientY;
    drag.current.startPosX   = pos?.x ?? 0;
    drag.current.startPosY   = pos?.y ?? 0;
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend',  onTouchEnd);
  }, [pos, onTouchMove, onTouchEnd]);

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormErr('');
    if (!email.trim())   { setFormErr('Email is required.');   return; }
    if (!subject.trim()) { setFormErr('Subject is required.');  return; }
    if (!message.trim()) { setFormErr('Message is required.');  return; }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormErr('Please enter a valid email address.');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        email:    email.trim(),
        subject:  subject.trim(),
        category,
        message:  message.trim(),
        user_id:  profile?.id ?? null,
        status:   'open',
      });
      if (error) throw error;
      setSuccess(true);
      // Auto-close after 3 seconds
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSubject('');
        setCategory('General');
        setMessage('');
        if (!profile?.email) setEmail('');
      }, 3000);
    } catch (err) {
      setFormErr('Failed to submit. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ─── Popup position — flip left/up if near edge ───────────
  const popupLeft = pos && pos.x > window.innerWidth / 2;
  const popupTop  = pos && pos.y > window.innerHeight / 2;

  if (!pos) return null; // wait for client-side mount

  return (
    <>
      {/* Floating button */}
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999 }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="select-none"
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
            open
              ? 'bg-cyan-600 shadow-cyan-500/40'
              : 'bg-[#111318] border-2 border-cyan-500/50 hover:border-cyan-400 hover:shadow-cyan-500/20'
          }`}
        >
          {open
            ? <X className="w-5 h-5 text-white pointer-events-none" />
            : <MessageCircle className="w-6 h-6 text-cyan-400 pointer-events-none" />
          }
        </div>

        {/* Popup form — rendered relative to button */}
        {open && (
          <div
            className="absolute bg-[#111318] border border-[#2A2D36] rounded-2xl shadow-2xl w-80"
            style={{
              [popupLeft ? 'right' : 'left']: 0,
              [popupTop  ? 'bottom' : 'top']: WIDGET_SIZE + 8,
            }}
            onMouseDown={e => e.stopPropagation()} // prevent drag while using form
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1E2128] flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Support</p>
                <p className="text-[10px] text-gray-500">We'll get back to you soon</p>
              </div>
            </div>

            {success ? (
              /* Success state */
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <CheckCircle className="w-12 h-12 text-green-400" />
                <p className="font-semibold text-white">Ticket Submitted!</p>
                <p className="text-sm text-gray-400">We'll get back to you soon. This window will close automatically.</p>
              </div>
            ) : (
              /* Form */
              <div className="px-5 py-4 space-y-3">
                {/* Email */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 bg-[#0A0B0D] border border-[#2A2D36] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0A0B0D] border border-[#2A2D36] rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="General">General</option>
                    <option value="Bug Report">Bug Report</option>
                    <option value="Billing">Billing</option>
                    <option value="Signal Issue">Signal Issue</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief description..."
                    className="w-full px-3 py-2 bg-[#0A0B0D] border border-[#2A2D36] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Message <span className="text-red-400">*</span></label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Tell us what's going on..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[#0A0B0D] border border-[#2A2D36] rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/50 resize-none"
                  />
                </div>

                {/* Error */}
                {formErr && (
                  <p className="text-xs text-red-400">{formErr}</p>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white transition-colors"
                >
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                    : <><Send className="w-4 h-4" /> Submit Ticket</>
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
