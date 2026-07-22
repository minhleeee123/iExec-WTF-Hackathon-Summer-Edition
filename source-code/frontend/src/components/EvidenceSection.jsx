import { FileKey2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import deployment from '../deployment.json';
import { shorten } from '../lib/format';

export default function EvidenceSection({ lastProof, onOpenProof, onOpenReceipt, pool, receipt }) {
  return (
    <section className="evidence-band">
      <div><p className="eyebrow">VERIFIABLE DEPLOYMENT</p><h2>Inspect what the wallet submitted.</h2><p>Input proofs, calldata, output handles, block numbers, and receipt metadata come from the most recent confirmed transaction.</p></div>
      <div className="evidence-actions">
        <button onClick={onOpenProof} disabled={!lastProof}><ShieldCheck size={17} /> Inspect last proof</button>
        <button onClick={onOpenReceipt} disabled={!receipt}><FileKey2 size={17} /> Open receipt NFT</button>
      </div>
      <div className="deployment-facts">
        <span><LockKeyhole size={16} /> Router bytecode live</span>
        <span><ShieldCheck size={16} /> NoxCompute {shorten(deployment.contracts.noxCompute, 8, 6)}</span>
        <span><KeyRound size={16} /> Pool handles {pool ? 'initialized' : 'loading'}</span>
      </div>
    </section>
  );
}
