// src/components/SupportWidget.tsx
// NXXT Futures — Floating Support Widget
// Draggable via Pointer Events API (unified mouse+touch, no double-fire bug)
// Position remembered in localStorage. Drag detection prevents accidental opens.

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Position helpers ─────────────────────────────────────────
const WIDGET_SIZE = 45; // px (20% smaller than original 56px)
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

  // Drag state in refs — never causes re-renders mid-drag
  const drag = useRef({
    active:   false,
    moved:    false,
    startPX:  0, // pointer start X
    startPY:  0, // pointer start Y
    startBX:  0, // button start X
    startBY:  0, // button start Y
  });

  // Keep current pos accessible inside pointer handlers without stale closure
  const posRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { posRef.current = pos; }, [pos]);

  // Initialise position client-side
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

  // ─── Pointer Events (unified mouse + touch, no double-fire) ──
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startPX;
    const dy = e.clientY - drag.current.startPY;
    // 8px threshold — forgiving for finger taps, still catches intentional drag
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) drag.current.moved = true;
    if (!drag.current.moved) return;
    setPos({
      x: clamp(drag.current.startBX + dx, 0, window.innerWidth  - WIDGET_SIZE),
      y: clamp(drag.current.startBY + dy, 0, window.innerHeight - WIDGET_SIZE),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup',   onPointerUp);
    if (drag.current.moved) {
      // Drag ended — save position, don't open form
      setPos(prev => {
        if (prev) localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
        return prev;
      });
    } else {
      // Clean tap — toggle form
      setOpen(o => !o);
    }
    drag.current.active = false;
    drag.current.moved  = false;
  }, [onPointerMove]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary button / first touch point
    if (!e.isPrimary) return;
    e.preventDefault(); // prevents compatibility mouse events firing after touch
    e.currentTarget.setPointerCapture(e.pointerId); // keeps tracking even if pointer leaves element
    drag.current.active  = true;
    drag.current.moved   = false;
    drag.current.startPX = e.clientX;
    drag.current.startPY = e.clientY;
    drag.current.startBX = posRef.current?.x ?? 0;
    drag.current.startBY = posRef.current?.y ?? 0;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup',   onPointerUp);
  }, [onPointerMove, onPointerUp]);

  // ─── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormErr('');
    if (!email.trim())   { setFormErr('Email is required.');   return; }
    if (!subject.trim()) { setFormErr('Subject is required.');  return; }
    if (!message.trim()) { setFormErr('Message is required.');  return; }
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
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setSubject('');
        setCategory('General');
        setMessage('');
        if (!profile?.email) setEmail('');
      }, 3000);
    } catch {
      setFormErr('Failed to submit. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ─── Popup position — flip left/up if near edge ───────────
  const popupLeft = pos && pos.x > window.innerWidth / 2;
  const popupTop  = pos && pos.y > window.innerHeight / 2;

  if (!pos) return null;

  return (
    <>
      {/* Floating button */}
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        className="select-none"
      >
        <div
          className={`rounded-full flex items-center justify-center shadow-2xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
            open
              ? 'bg-cyan-600 shadow-cyan-500/40'
              : 'bg-[#111318] border-2 border-cyan-500/50 hover:border-cyan-400 hover:shadow-cyan-500/20'
          }`}
          style={{ width: WIDGET_SIZE, height: WIDGET_SIZE }}
        >
          {open
            ? <X className="w-4 h-4 text-white pointer-events-none" />
            : <MessageCircle className="w-5 h-5 text-cyan-400 pointer-events-none" />
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
            onPointerDown={e => e.stopPropagation()} // prevent drag while using form
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
