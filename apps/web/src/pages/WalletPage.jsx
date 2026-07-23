import { useSearchParams } from 'react-router-dom';
import AclSection from '../components/AclSection';
import AssetOperations from '../components/AssetOperations';
import PageHeading from '../components/PageHeading';
import SafeTreasury from '../components/SafeTreasury';

export default function WalletPage({ aclProps, assetProps, safeProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = ['assets', 'access', 'safe'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'assets';

  const selectTab = (nextTab) => {
    setSearchParams(nextTab === 'assets' ? {} : { tab: nextTab }, { replace: true });
    window.requestAnimationFrame(() => document.getElementById(`wallet-tab-${nextTab}`)?.focus());
  };
  const handleTabKey = (event) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = ['assets', 'access', 'safe'];
    const current = tabs.indexOf(tab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (current + 1) % tabs.length;
    selectTab(tabs[nextIndex]);
  };

  return (
    <main className="app-page wallet-page">
      <PageHeading eyebrow="ERC-7984 WALLET" title="Wallet" description="Fund test assets, move value between public and private form, or authorize selective disclosure." aside={<><strong>4 private assets</strong><span>1:1 wrappers · Per-handle ACL</span></>} />
      <div className="workflow-shell wide-workflow">
        <div className="workflow-tabs" role="tablist" aria-label="Wallet mode">
          <button id="wallet-tab-assets" role="tab" aria-selected={tab === 'assets'} aria-controls="wallet-panel-assets" tabIndex={tab === 'assets' ? 0 : -1} className={tab === 'assets' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('assets')}>Assets</button>
          <button id="wallet-tab-access" role="tab" aria-selected={tab === 'access'} aria-controls="wallet-panel-access" tabIndex={tab === 'access' ? 0 : -1} className={tab === 'access' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('access')}>Auditor access</button>
          <button id="wallet-tab-safe" role="tab" aria-selected={tab === 'safe'} aria-controls="wallet-panel-safe" tabIndex={tab === 'safe' ? 0 : -1} className={tab === 'safe' ? 'active' : ''} onKeyDown={handleTabKey} onClick={() => selectTab('safe')}>Safe treasury</button>
        </div>
        <div className="workflow-content" role="tabpanel" id={`wallet-panel-${tab}`} aria-labelledby={`wallet-tab-${tab}`} tabIndex="0">
          {tab === 'assets' ? <AssetOperations {...assetProps} embedded /> : tab === 'access' ? <AclSection {...aclProps} embedded /> : <SafeTreasury {...safeProps} />}
        </div>
      </div>
    </main>
  );
}
