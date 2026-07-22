import ActivitySection from '../components/ActivitySection';
import EvidenceSection from '../components/EvidenceSection';
import PageHeading from '../components/PageHeading';

export default function ActivityPage({ activityProps, evidenceProps }) {
  return (
    <main className="app-page">
      <PageHeading eyebrow="ON-CHAIN EVIDENCE" title="Activity" description="Inspect confirmed wallet actions, encrypted handles, Gateway verification, and receipt metadata." aside={<><strong>Sepolia</strong><span>History and proofs</span></>} />
      <div className="activity-workflow">
        <ActivitySection {...activityProps} />
        <EvidenceSection {...evidenceProps} />
      </div>
    </main>
  );
}
