import { Navigate, useSearchParams } from 'react-router-dom';
import AclSection from '../components/AclSection';
import AssetOperations from '../components/AssetOperations';
import PageHeading from '../components/PageHeading';

export default function WalletPage({ aclProps, assetProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = requestedTab === 'access' ? 'access' : 'assets';

  const selectTab = (nextTab) => {
    setSearchParams(nextTab === 'assets' ? {} : { tab: nextTab }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`wallet-tab-${nextTab}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['assets', 'access'];
    const current = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + 1) % tabs.length;
    selectTab(tabs[nextIndex]);
  };

  if (requestedTab === 'safe') return <Navigate replace to="/app/safe" />;

  return (
    <main className="app-page wallet-page">
      <PageHeading eyebrow="ERC-7984 WALLET" title="Wallet" description="Fund test assets, move value between public and private form, or authorize selective disclosure." aside={<><strong>4 private assets</strong><span>1:1 wrappers · Per-handle ACL</span></>} />
      <div className="workflow-shell wide-workflow">
        <div className="workflow-tabs" role="tablist" aria-label="Wallet mode">
          <button id="wallet-tab-assets" role="tab" aria-selected={tab === 'assets'} aria-controls="wallet-panel-assets" tabIndex={tab === 'assets' ? 0 : -1} className={tab === 'assets' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('assets')}>Assets</button>
          <button id="wallet-tab-access" role="tab" aria-selected={tab === 'access'} aria-controls="wallet-panel-access" tabIndex={tab === 'access' ? 0 : -1} className={tab === 'access' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('access')}>Auditor access</button>
        </div>
        <div className="workflow-content" role="tabpanel" id={`wallet-panel-${tab}`} aria-labelledby={`wallet-tab-${tab}`} tabIndex="0">
          {tab === 'assets' ? <AssetOperations {...assetProps} embedded /> : <AclSection {...aclProps} embedded />}
        </div>
      </div>
    </main>
  );
}
