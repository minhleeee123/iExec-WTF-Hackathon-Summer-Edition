import { FileKey2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import deployment from '../deployment.json';
import { shorten } from '../lib/format';

export default function EvidenceSection({
  attestation,
  comparison,
  lastProof,
  onOpenProof,
  onOpenReceipt,
  pool,
  receipt,
}) {
  return (
    <section className="evidence-band">
      <div><p className="eyebrow">VERIFIABLE EXECUTION</p><h2>Inspect what the wallet submitted.</h2><p>Proofs, encrypted protection handles, Gateway verification, and measured oracle deviation come from confirmed client operations.</p></div>
      <div className="evidence-actions">
        <button onClick={onOpenProof} disabled={!lastProof}><ShieldCheck size={17} /> Inspect last proof</button>
        <button onClick={onOpenReceipt} disabled={!receipt}><FileKey2 size={17} /> Open receipt NFT</button>
      </div>
      {(attestation || comparison) && (
        <div className="evidence-metrics">
          {attestation && <div><span>Gateway response</span><strong>Signature verified</strong><small>{attestation.handles} handle{attestation.handles === 1 ? '' : 's'} · {new Date(attestation.verifiedAt).toLocaleTimeString()}</small></div>}
          {comparison && <div><span>Execution vs oracle</span><strong>{comparison.deviationBps > 0 ? '+' : ''}{comparison.deviationBps.toFixed(1)} bps</strong><small>Actual {comparison.actual} / reference {comparison.reference} {comparison.symbol}</small></div>}
        </div>
      )}
      <div className="deployment-facts">
        <span><LockKeyhole size={16} /> Router V2 bytecode live</span>
        <span><ShieldCheck size={16} /> NoxCompute {shorten(deployment.contracts.noxCompute, 8, 6)}</span>
        <span><KeyRound size={16} /> Pool handles {pool ? `${Object.keys(pool).length} initialized` : 'loading'}</span>
      </div>
    </section>
  );
}
