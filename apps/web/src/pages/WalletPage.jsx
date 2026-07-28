import { Navigate, useSearchParams } from 'react-router-dom';
import AclSection from '../components/AclSection';
import AssetOperations from '../components/AssetOperations';
import PageHeading from '../components/PageHeading';
import SharedAccessPanel from '../components/SharedAccessPanel';

export default function WalletPage({ aclProps, assetProps, sharedProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const tab = ['access', 'shared'].includes(requestedTab) ? requestedTab : 'assets';
  const sharedHolder = searchParams.get('holder') ?? '';

  const selectTab = (nextTab) => {
    const nextParams = nextTab === 'assets'
      ? {}
      : nextTab === 'shared'
        ? { tab: nextTab, ...(sharedHolder ? { holder: sharedHolder } : {}) }
        : { tab: nextTab };
    setSearchParams(nextParams, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`wallet-tab-${nextTab}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['assets', 'access', 'shared'];
    const current = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
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
          <button id="wallet-tab-shared" role="tab" aria-selected={tab === 'shared'} aria-controls="wallet-panel-shared" tabIndex={tab === 'shared' ? 0 : -1} className={tab === 'shared' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('shared')}>Shared with me</button>
        </div>
        <div className="workflow-content" role="tabpanel" id={`wallet-panel-${tab}`} aria-labelledby={`wallet-tab-${tab}`} tabIndex="0">
          {tab === 'assets' ? <AssetOperations {...assetProps} embedded /> : tab === 'access' ? <AclSection {...aclProps} embedded /> : <SharedAccessPanel {...sharedProps} initialHolder={sharedHolder} onHolderCommitted={(holder) => setSearchParams({ tab: 'shared', holder }, { replace: true })} variant="wallet" />}
        </div>
      </div>
    </main>
  );
}
