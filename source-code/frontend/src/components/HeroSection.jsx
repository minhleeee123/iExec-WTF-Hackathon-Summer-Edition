import { CheckCircle2, ExternalLink } from 'lucide-react';
import deployment from '../deployment.json';
import hero from '../assets/hero.png';

export default function HeroSection({ ethPrice }) {
  return (
    <section className="status-band">
      <div>
        <p className="eyebrow">CONFIDENTIAL AMM ON ETHEREUM SEPOLIA</p>
        <h1>Swap without publishing amounts.</h1>
        <p className="lede">Real ERC-7984 balances, Nox encrypted handles, constant-product settlement, and on-chain receipt NFTs.</p>
        <div className="status-row">
          <span><CheckCircle2 size={16} /> NoxCompute deployed</span>
          <span><CheckCircle2 size={16} /> Encrypted pool live</span>
          <a href={deployment.explorerUrl} target="_blank" rel="noreferrer">Router <ExternalLink size={14} /></a>
        </div>
      </div>
      <div className="protocol-visual" aria-label="Nox encrypted execution architecture">
        <img src={hero} alt="Two protocol layers representing encrypted input and settlement" />
        <dl>
          <div><dt>Gateway</dt><dd>gateway-testnets.noxprotocol.dev</dd></div>
          <div><dt>Network</dt><dd>Chain ID 11155111</dd></div>
          <div><dt>ETH / USD</dt><dd>{ethPrice ? `$${ethPrice.toLocaleString()}` : 'Loading...'}</dd></div>
        </dl>
      </div>
    </section>
  );
}
