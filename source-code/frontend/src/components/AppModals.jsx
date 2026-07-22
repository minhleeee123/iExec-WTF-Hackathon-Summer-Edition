import { useEffect } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';

export default function AppModals({
  lastProof,
  onCloseProof,
  onCloseReceipt,
  receipt,
  showProof,
  showReceipt,
}) {
  useEffect(() => {
    if (!showProof && !showReceipt) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (showProof) onCloseProof();
      if (showReceipt) onCloseReceipt();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCloseProof, onCloseReceipt, showProof, showReceipt]);

  return (
    <>
      {showProof && lastProof && (
        <div className="modal-backdrop" onMouseDown={onCloseProof}>
          <div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Privacy proof inspector">
            <div className="section-heading"><div><p className="eyebrow">TRANSACTION EVIDENCE</p><h2>Privacy proof inspector</h2></div><button className="icon-button" onClick={onCloseProof} aria-label="Close proof inspector"><X size={18} /></button></div>
            <dl className="proof-list">
              <div><dt>Transaction</dt><dd>{lastProof.transactionHash}</dd></div>
              <div><dt>Router</dt><dd>{lastProof.contract}</dd></div>
              <div><dt>Input handle</dt><dd>{lastProof.inputHandle}</dd></div>
              <div><dt>Input proof</dt><dd>{lastProof.inputProofBytes} bytes</dd></div>
              {lastProof.minOutHandle && <div><dt>MinOut handle</dt><dd>{lastProof.minOutHandle}</dd></div>}
              {lastProof.minOutProofBytes !== undefined && <div><dt>MinOut proof</dt><dd>{lastProof.minOutProofBytes} bytes</dd></div>}
              <div><dt>Output handle</dt><dd>{lastProof.outputHandle}</dd></div>
              {lastProof.refundHandle && <div><dt>Refund handle</dt><dd>{lastProof.refundHandle}</dd></div>}
              {lastProof.deadline && <div><dt>Deadline</dt><dd>{new Date(lastProof.deadline * 1000).toLocaleString()}</dd></div>}
              <div><dt>Block</dt><dd>{lastProof.blockNumber}</dd></div>
              <div><dt>Calldata</dt><dd className="calldata">{lastProof.calldata}</dd></div>
            </dl>
            <button className="secondary-action" onClick={() => navigator.clipboard.writeText(lastProof.transactionHash)}><Copy size={16} /> Copy transaction hash</button>
          </div>
        </div>
      )}

      {showReceipt && receipt && (
        <div className="modal-backdrop" onMouseDown={onCloseReceipt}>
          <div className="modal receipt-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Receipt NFT">
            <div className="section-heading"><div><p className="eyebrow">ERC-721 ON SEPOLIA</p><h2>Receipt #{receipt.id}</h2></div><button className="icon-button" onClick={onCloseReceipt} aria-label="Close receipt"><X size={18} /></button></div>
            {receipt.image && <img src={receipt.image} alt={`On-chain NoxSwap receipt ${receipt.id}`} />}
            <p>Owner <code>{receipt.owner}</code></p>
            <a className="secondary-action" href={`https://sepolia.etherscan.io/tx/${receipt.transactionHash}`} target="_blank" rel="noreferrer">View mint transaction <ExternalLink size={16} /></a>
          </div>
        </div>
      )}
    </>
  );
}
