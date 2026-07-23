import { useSearchParams } from 'react-router-dom';
import PageHeading from '../components/PageHeading';
import SafeTreasury from '../components/SafeTreasury';

const SECTIONS = ['overview', 'swap', 'orders', 'activity', 'security'];

export default function SafePage({ safeProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const section = SECTIONS.includes(requestedSection) ? requestedSection : 'overview';
  const enabled = Boolean(safeProps.safe?.moduleEnabled);

  const selectSection = (nextSection) => {
    setSearchParams(nextSection === 'overview' ? {} : { section: nextSection }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`safe-tab-${nextSection}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = SECTIONS.indexOf(section);
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? SECTIONS.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + SECTIONS.length) % SECTIONS.length;
    selectSection(SECTIONS[next]);
  };

  return (
    <main className="app-page safe-page">
      <PageHeading
        eyebrow="SAFE × NOX COMPOSABILITY"
        title="Safe Treasury"
        description="Operate confidential assets owned by a Safe smart account through an explicitly allowlisted Nox module."
        aside={<><strong>{enabled ? 'Module enabled' : 'Module paused'}</strong><span>Safe v1.4.1 · Restricted execution</span></>}
      />
      <div className="workflow-shell safe-workflow-shell">
        <div className="workflow-tabs safe-workflow-tabs" role="tablist" aria-label="Safe Treasury section">
          {[
            ['overview', 'Overview'],
            ['swap', 'Swap & unwrap'],
            ['orders', 'Orders & Agent'],
            ['activity', 'Activity'],
            ['security', 'Access & security'],
          ].map(([value, label]) => (
            <button
              id={`safe-tab-${value}`}
              key={value}
              type="button"
              role="tab"
              aria-selected={section === value}
              aria-controls={`safe-panel-${value}`}
              tabIndex={section === value ? 0 : -1}
              className={section === value ? 'active' : ''}
              onKeyDown={handleTabKey}
              onClick={() => selectSection(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="workflow-content" role="tabpanel" id={`safe-panel-${section}`} aria-labelledby={`safe-tab-${section}`} tabIndex="0">
          <SafeTreasury {...safeProps} onNavigate={selectSection} view={section} />
        </div>
      </div>
    </main>
  );
}
