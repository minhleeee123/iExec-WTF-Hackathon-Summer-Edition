import { Activity, ArrowUpRight, ExternalLink, FileKey2 } from 'lucide-react';
import { shorten } from '../lib/format';
import { CardHelpButton } from './CardHelpModal';

export default function ActivitySection({ history = [], logs = [], onOpenReceipt }) {
  return (
    <section id="activity" className="activity-grid">
      <div className="history-panel">
        <div className="section-heading">
          <div><p className="eyebrow">ON-CHAIN EVENTS</p><h2>Swap history</h2></div>
          <CardHelpButton
            category="SWAP HISTORY GUIDE"
            title="On-Chain Events & Receipts"
            description="Track confirmed confidential swaps mined on Sepolia testnet and view encrypted receipt proofs."
            steps={[
              { heading: 'Step 1 - Gas Fee & On-Chain Mining', detail: 'Transactions are submitted to Sepolia EVM using Sepolia ETH for gas.' },
              { heading: 'Step 2 - Encrypted Output Handle', detail: 'The encrypted ciphertext handle produced by Nox TEE router is recorded in each event log.' },
              { heading: 'Step 3 - View Receipt Details', detail: 'Click the Key icon on any swap row to open the full cryptographic receipt proof.' },
              { heading: 'Step 4 - Etherscan Verification', detail: 'Click the Arrow icon to verify the mined transaction hash directly on Sepolia Etherscan.' },
            ]}
          />
        </div>
        {history.length === 0 ? <p className="empty-state">No SwapExecuted events found for this wallet.</p> : (
          <div className="history-table" role="table">
            {history.map((item) => (
              <div className="history-item" key={item.hash} role="row">
                <div><strong>Receipt #{item.receiptId}</strong><small>Block {item.block}</small></div>
                <code>{shorten(item.outputHandle, 12, 8)}</code>
                <a href={`https://sepolia.etherscan.io/tx/${item.hash}`} target="_blank" rel="noreferrer" aria-label="Open transaction"><ArrowUpRight size={17} /></a>
                <button className="icon-button" onClick={() => onOpenReceipt(item)} aria-label={`Open receipt ${item.receiptId}`}><FileKey2 size={17} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="log-panel">
        <div className="section-heading"><div><p className="eyebrow">CLIENT LOG</p><h2>Execution evidence</h2></div><Activity size={20} /></div>
        {logs.length === 0 ? <p className="empty-state">Wallet actions will appear here as they occur.</p> : logs.map((entry, index) => (
          <div className="log-entry" key={`${entry.time}-${index}`}><time>{entry.time}</time><span>{entry.message}</span>{entry.transactionHash && <a href={`https://sepolia.etherscan.io/tx/${entry.transactionHash}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /></a>}</div>
        ))}
      </div>
    </section>
  );
}
