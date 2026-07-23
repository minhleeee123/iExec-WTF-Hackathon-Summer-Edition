// Canonical browser-safe ABI surface. Run `npm run sync:client` after editing.
export const TEST_TOKEN_ABI = [
  'error FaucetCooldown(uint64 availableAt)',
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
  'function confidentialSwap(address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes inputProof,bytes32 encryptedMinOut,bytes minOutProof,uint64 deadline) returns (bytes32 encryptedAmountOut,bytes32 encryptedRefund,uint256 receiptId)',
  'function getPoolHandles(address tokenA,address tokenB) view returns (address token0,address token1,bytes32 reserve0,bytes32 reserve1)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function swapReceipts(uint256 receiptId) view returns (address trader,address tokenIn,address tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,bytes32 encryptedRefund,uint64 timestamp,uint64 deadline)',
  'event SwapExecuted(address indexed trader,address indexed tokenIn,address indexed tokenOut,bytes32 encryptedInput,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId,uint64 deadline)',
];

export const LIMIT_ORDER_ABI = [
  'function createOrder(address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes amountProof,bytes32 encryptedMinOut,bytes minOutProof,uint256 triggerPrice,uint64 expiry) returns (uint256 orderId)',
  'function executeOrder(uint256 orderId) returns (bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'function cancelOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
  'function expireOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
  'function canExecute(uint256 orderId) view returns (bool executable,uint256 currentPrice)',
  'function getOrder(uint256 orderId) view returns (address owner,address tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes32 encryptedMinOut,uint256 triggerPrice,uint64 expiry,uint8 status)',
  'function nextOrderId() view returns (uint256)',
  'function MAX_ORACLE_AGE() view returns (uint256)',
  'function priceDecimals() view returns (uint8)',
  'event OrderCreated(uint256 indexed orderId,address indexed owner,address indexed tokenIn,address tokenOut,bytes32 encryptedAmountIn,bytes32 encryptedMinOut,uint256 triggerPrice,uint64 expiry)',
  'event OrderExecuted(uint256 indexed orderId,address indexed executor,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'event OrderCancelled(uint256 indexed orderId,bytes32 encryptedRefund)',
  'event OrderExpired(uint256 indexed orderId,bytes32 encryptedRefund)',
];

export const CHAINLINK_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
];

export const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
