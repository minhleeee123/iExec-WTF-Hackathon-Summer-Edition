import { AlertCircle, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';

export default function OrderReadiness({ checks, loading = false, title = 'Transaction readiness' }) {
  const blockers = checks.filter((check) => !check.pass);
  return (
    <section className="readiness-panel" aria-label={title}>
      <div className="readiness-heading">
        <div><ShieldCheck size={17} /><strong>{title}</strong></div>
        <span className={blockers.length === 0 ? 'ready' : 'blocked'} aria-live="polite">{loading ? 'Checking' : blockers.length === 0 ? 'Ready' : `${blockers.length} blocked`}</span>
      </div>
      <div className="readiness-list">
        {checks.map((check) => (
          <div className={check.pass ? 'pass' : 'fail'} key={check.id}>
            {loading && check.id === 'handle' ? <LoaderCircle className="spin" size={14} /> : check.pass ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span><strong>{check.label}</strong><small>{check.detail}</small></span>
          </div>
        ))}
      </div>
    </section>
  );
}
