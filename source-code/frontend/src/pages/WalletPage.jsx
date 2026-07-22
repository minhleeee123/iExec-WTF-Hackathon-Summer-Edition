import { useSearchParams } from 'react-router-dom';
import AclSection from '../components/AclSection';
import AssetOperations from '../components/AssetOperations';
import PageHeading from '../components/PageHeading';

export default function WalletPage({ aclProps, assetProps }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'access' ? 'access' : 'assets';

  const selectTab = (nextTab) => {
    setSearchParams(nextTab === 'access' ? { tab: 'access' } : {}, { replace: true });
  };

  return (
    <main className="app-page wallet-page">
      <PageHeading eyebrow="ERC-7984 WALLET" title="Wallet" description="Fund test assets, move value between public and private form, or authorize selective disclosure." aside={<><strong>4 private assets</strong><span>1:1 wrappers · Per-handle ACL</span></>} />
      <div className="workflow-shell wide-workflow">
        <div className="workflow-tabs" role="tablist" aria-label="Wallet mode">
          <button role="tab" aria-selected={tab === 'assets'} className={tab === 'assets' ? 'active' : ''} onClick={() => selectTab('assets')}>Assets</button>
          <button role="tab" aria-selected={tab === 'access'} className={tab === 'access' ? 'active' : ''} onClick={() => selectTab('access')}>Auditor access</button>
        </div>
        <div className="workflow-content">
          {tab === 'assets' ? <AssetOperations {...assetProps} embedded /> : <AclSection {...aclProps} embedded />}
        </div>
      </div>
    </main>
  );
}
