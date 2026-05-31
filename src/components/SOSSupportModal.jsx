import { Heart, MessageSquare, Wind, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const URGENT_SUPPORT_TEMPLATE = "I'm having a really difficult time right now and could use some support when you are available.";

export default function SOSSupportModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  const goToGrounding = () => {
    onClose?.();
    navigate('/therapy?grounding=guided-breathing');
  };

  const goToInbox = () => {
    onClose?.();
    navigate('/inbox', { state: { messageTemplate: URGENT_SUPPORT_TEMPLATE, urgent: true } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sos-support-title">
      <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-700/60 dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h2 id="sos-support-title" className="text-xl font-semibold text-slate-950 dark:text-white">Pause for support</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">You do not have to move through this moment alone.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Close support options">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-6 rounded-2xl bg-amber-50 p-4 text-base leading-relaxed text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          It looks like you're carrying a lot right now. What would feel most supportive?
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={goToGrounding} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:scale-[1.01]">
            <Wind className="h-4 w-4" />
            Try a Grounding Exercise
          </button>
          <button type="button" onClick={goToInbox} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition hover:scale-[1.01]">
            <MessageSquare className="h-4 w-4" />
            Message my Therapist
          </button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          If you may hurt yourself or someone else, call emergency services or a local crisis line now. This app is not monitored 24/7.
        </p>
      </div>
    </div>
  );
}
