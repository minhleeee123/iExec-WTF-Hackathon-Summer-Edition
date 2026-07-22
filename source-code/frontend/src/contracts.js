export const TEST_TOKEN_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
  'function faucet()',
  'function faucetAmount() view returns (uint256)',
  'function lastClaimAt(address account) view returns (uint256)',
];

export const CONFIDENTIAL_TOKEN_ABI = [
  'function confidentialBalanceOf(address account) view returns (bytes32)',
  'function wrap(address to,uint256 amount) returns (bytes32)',
  'function unwrap(address from,address to,bytes32 encryptedAmount,bytes inputProof) returns (bytes32)',
  'function finalizeUnwrap(bytes32 unwrapRequestId,bytes decryptedAmountAndProof)',
  'function setOperator(address operator,uint48 until)',
  'function isOperator(address holder,address spender) view returns (bool)',
  'function grantBalanceViewer(address viewer)',
  'event UnwrapRequested(address indexed receiver,bytes32 amount)',
  'event UnwrapFinalized(address indexed receiver,bytes32 encryptedAmount,uint256 plaintextAmount)',
  'event BalanceViewerGranted(address indexed holder,address indexed viewer,bytes32 balance)',
];

export const NOX_SWAP_ABI = [
  'function confidentialSwap(address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes inputProof) returns (bytes32 encryptedAmountOut,uint256 receiptId)',
  'function getPoolHandles(address tokenA,address tokenB) view returns (address token0,address token1,bytes32 reserve0,bytes32 reserve1)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function swapReceipts(uint256 receiptId) view returns (address trader,address tokenIn,address tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,uint64 timestamp)',
  'event SwapExecuted(address indexed trader,address indexed tokenIn,address indexed tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,uint256 receiptId)',
];

export const CHAINLINK_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
];

export const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
