import { ExternalLink, HelpCircle, X } from 'lucide-react';
import { useState } from 'react';

export function CardHelpButton({ category, description, title, steps = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="card-help-trigger"
        onClick={() => setOpen(true)}
        aria-label={`Guide & instructions for ${title}`}
        title={`Click for guide & instructions on ${title}`}
      >
        <HelpCircle size={16} />
        <span>Guide</span>
      </button>

      {open && (
        <div className="modal-backdrop" onMouseDown={() => setOpen(false)}>
          <div
            className="modal card-help-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${title} User Guide`}
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">{category ?? 'FEATURE GUIDE'}</p>
                <h2>{title} Guide</h2>
              </div>
              <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close guide modal">
                <X size={18} />
              </button>
            </div>

            <p className="modal-intro">{description}</p>

            {steps.length > 0 && (
              <div className="guide-steps">
                <strong>Step-by-step instructions:</strong>
                <ol>
                  {steps.map((step, index) => (
                    <li key={index}>
                      <strong>{step.heading}:</strong> {step.detail}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="gas-reminder-box">
              <div className="gas-reminder-text">
                <strong>⛽ Sepolia ETH Gas Fee Reminder:</strong>
                <span>You must have Sepolia ETH in your wallet to cover gas fees for on-chain transactions on Sepolia Testnet.</span>
              </div>
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noreferrer"
                className="faucet-modal-link"
              >
                Claim Sepolia ETH Faucet <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
