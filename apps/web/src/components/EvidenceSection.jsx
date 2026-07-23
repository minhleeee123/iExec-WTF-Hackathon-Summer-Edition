import { FileKey2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import deployment from '../deployment.json';
import { shorten } from '../lib/format';
import { CardHelpButton } from './CardHelpModal';

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
      <div>
        <div className="section-heading">
          <div><p className="eyebrow">VERIFIABLE EXECUTION</p><h2>Inspect what the wallet submitted.</h2></div>
          <CardHelpButton
            category="VERIFICATION GUIDE"
            title="TEE Proofs & Cryptographic Receipts"
            description="Inspect iExec Nox Trusted Execution Environment (TEE) attestation proofs, hardware signatures, and cryptographic execution receipts."
            steps={[
              { heading: 'Step 1 - View Gateway Attestation', detail: 'Click "Inspect last proof" to verify SGX enclave hardware signatures and Gateway verification.' },
              { heading: 'Step 2 - View Receipt Proof', detail: 'Click "Open receipt NFT" to inspect encrypted input/output handles, timestamp, and transaction parameters.' },
              { heading: 'Step 3 - Measured Oracle Deviation', detail: 'Compare actual confidential execution rate against public Chainlink reference price in basis points (bps).' },
            ]}
          />
        </div>
        <p>Proofs, encrypted protection handles, Gateway verification, and measured oracle deviation come from confirmed client operations.</p>
      </div>
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
