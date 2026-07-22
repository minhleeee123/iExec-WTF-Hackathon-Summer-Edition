import { ExternalLink, GitFork } from 'lucide-react';
import deployment from '../deployment.json';

const repositoryUrl = 'https://github.com/minhleeee123/iExec-WTF-Hackathon-Summer-Edition';
const orderBookExplorerUrl = `https://sepolia.etherscan.io/address/${deployment.contracts.limitOrderBook}`;
const sourcifyUrl = `https://repo.sourcify.dev/11155111/${deployment.contracts.noxSwapRouter}`;

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div><strong>NoxSwap</strong><span>Confidential DeFi on Ethereum Sepolia. Testnet only.</span></div>
      <nav aria-label="Project resources">
        <a href={repositoryUrl} target="_blank" rel="noreferrer"><GitFork size={15} /> GitHub</a>
        <a href={deployment.explorerUrl} target="_blank" rel="noreferrer">Router <ExternalLink size={14} /></a>
        <a href={orderBookExplorerUrl} target="_blank" rel="noreferrer">OrderBook <ExternalLink size={14} /></a>
        <a href={sourcifyUrl} target="_blank" rel="noreferrer">Verified source <ExternalLink size={14} /></a>
      </nav>
    </footer>
  );
}
