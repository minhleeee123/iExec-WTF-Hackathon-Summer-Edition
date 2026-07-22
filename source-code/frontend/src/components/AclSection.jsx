import { FileKey2, KeyRound, LoaderCircle } from 'lucide-react';

export default function AclSection({ aclResult, auditor, busy, connected, onAuditorChange, onGrant }) {
  return (
    <section className="section-band acl-band">
      <div className="section-title"><div><p className="eyebrow">SELECTIVE DISCLOSURE</p><h2>Grant an auditor access</h2></div><p>The viewer is written to the ACL of each initialized balance handle. Public explorers still see only bytes32 handles.</p></div>
      <div className="acl-form">
        <FileKey2 size={22} />
        <input value={auditor} onChange={(event) => onAuditorChange(event.target.value)} placeholder="0x auditor address" aria-label="Auditor address" />
        <button onClick={onGrant} disabled={!connected || Boolean(busy)}>{busy === 'acl' ? <LoaderCircle className="spin" size={17} /> : <KeyRound size={17} />} Grant viewer</button>
      </div>
      {aclResult && <div className="acl-results">{aclResult.map((item) => <span key={item.symbol} className={item.confirmed ? 'pass' : 'pending'}>{item.symbol}: {item.confirmed ? 'confirmed' : 'indexing'}</span>)}</div>}
    </section>
  );
}
