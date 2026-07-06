import { Link } from 'react-router-dom';

const LEGAL_COPY = {
  privacy: {
    title: 'Privacy Policy',
    eyebrow: 'Your data and trust',
    intro: 'This app is designed for reflective IFS-informed learning and advisor-supported practice. Personal reflections, parts work, assessments, and messages should be treated with care.',
    sections: [
      ['Information we collect', 'Account details, profile information, assessment responses, journal entries, practice progress, media interactions, messages, and advisor notes may be stored to support your experience.'],
      ['How information is used', 'Information is used to personalize curriculum, support client-advisor collaboration, provide reminders, improve app reliability, and maintain safety-oriented records.'],
      ['Sharing and access', 'Access should be limited to you, your connected advisor or care team where applicable, and authorized operational administrators. Do not use this app as an emergency service.'],
      ['Your choices', 'You can review profile and notification settings in the app. Contact your organization or support contact for account, export, or deletion requests.'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    eyebrow: 'Using the app safely',
    intro: 'By using this app, you agree to use it as a supportive learning and reflection tool, not as a substitute for emergency, medical, or mental health crisis care.',
    sections: [
      ['Appropriate use', 'Use the app for lawful, respectful, and non-emergency purposes. If you are in immediate danger or crisis, contact local emergency services or a crisis hotline.'],
      ['Clinical boundaries', 'IFS-informed exercises can surface sensitive material. Move at your own pace and involve a qualified professional when needed.'],
      ['Account responsibility', 'Keep login credentials private and only access client or advisor areas you are authorized to use.'],
      ['Content and availability', 'Features, exercises, AI-generated guidance, and integrations may change over time as the app improves.'],
    ],
  },
};

export default function Legal({ type = 'privacy' }) {
  const content = LEGAL_COPY[type] || LEGAL_COPY.privacy;

  return (
    <main className="min-h-screen bg-brand-sanctuary px-4 py-10 text-brand-stone-900 dark:bg-brand-midnight dark:text-slate-100">
      <div className="mx-auto max-w-3xl rounded-3xl border border-brand-gold-200/70 bg-white/90 p-8 shadow-sm dark:border-brand-gold-900/40 dark:bg-slate-950/80">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-brand-gold-700 dark:text-brand-gold-400">{content.eyebrow}</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold">{content.title}</h1>
        <p className="mt-4 text-sm leading-7 text-brand-stone-700 dark:text-slate-300">{content.intro}</p>
        <div className="mt-8 space-y-6">
          {content.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="font-serif text-xl font-semibold">{heading}</h2>
              <p className="mt-2 text-sm leading-7 text-brand-stone-700 dark:text-slate-300">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/sign-in" className="rounded-full bg-brand-gold-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-gold-700">Back to sign in</Link>
          <Link to={type === 'privacy' ? '/terms' : '/privacy'} className="rounded-full border border-brand-gold-300 px-5 py-2 text-sm font-semibold text-brand-stone-700 hover:bg-brand-gold-50 dark:text-slate-200 dark:hover:bg-brand-gold-950/30">
            View {type === 'privacy' ? 'Terms' : 'Privacy Policy'}
          </Link>
        </div>
      </div>
    </main>
  );
}
