// Generated from packages/contracts/client/abis.js. Do not edit directly.
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
  'function unwrap(address from,address to,bytes32 amount) returns (bytes32)',
  'function unwrap(address from,address to,bytes32 encryptedAmount,bytes inputProof) returns (bytes32)',
  'function finalizeUnwrap(bytes32 unwrapRequestId,bytes decryptedAmountAndProof)',
  'function unwrapRequester(bytes32 unwrapRequestId) view returns (address)',
  'function setOperator(address operator,uint48 until)',
  'function isOperator(address holder,address spender) view returns (bool)',
  'function grantBalanceViewer(address viewer)',
  'event ConfidentialTransfer(address indexed from,address indexed to,bytes32 indexed amount)',
  'event UnwrapRequested(address indexed receiver,bytes32 amount)',
  'event UnwrapFinalized(address indexed receiver,bytes32 encryptedAmount,uint256 plaintextAmount)',
  'event BalanceViewerGranted(address indexed holder,address indexed viewer,bytes32 balance)',
];

export const NOX_COMPUTE_ABI = [
  'function isAllowed(bytes32 handle,address viewer) view returns (bool)',
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
  'function createOrderAuthorized(address tokenIn,address tokenOut,bytes32 preparedAmountIn,bytes32 preparedMinOut,address receiptOwner,uint256 triggerPrice,uint64 expiry) returns (uint256 orderId)',
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

export const SAFE_MODULE_ABI = [
  'function safe() view returns (address)',
  'function router() view returns (address)',
  'function orderBook() view returns (address)',
  'function noxCompute() view returns (address)',
  'function immutableToken(address token) view returns (bool)',
  'function isEnabled() view returns (bool)',
  'function prepareInput(bytes32 encryptedInput,bytes inputProof,address consumer) returns (bytes32 preparedHandle)',
  'function prepareInputs(bytes32[] encryptedInputs,bytes[] inputProofs,address consumer) returns (bytes32[] preparedHandles)',
  'function confidentialSwap(address tokenIn,address tokenOut,bytes32 preparedAmountIn,bytes32 preparedMinOut,address receiptOwner,uint64 deadline) returns (bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'function createLimitOrder(address tokenIn,address tokenOut,bytes32 preparedAmountIn,bytes32 preparedMinOut,address receiptOwner,uint256 triggerPrice,uint64 expiry) returns (uint256 orderId)',
  'function cancelLimitOrder(uint256 orderId) returns (bytes32 encryptedRefund)',
  'function requestUnwrap(address token,bytes32 preparedAmount,address recipient) returns (bytes32 unwrapRequestId)',
  'function setTokenOperator(address token,address operator,uint48 until)',
  'function addViewer(bytes32 handle,address viewer)',
  'function addViewers(bytes32[] handles,address viewer)',
  'function revoke(address previousModule)',
  'event SafeSwapExecuted(address indexed safe,address indexed tokenIn,address indexed tokenOut,bytes32 encryptedOutput,bytes32 encryptedRefund,uint256 receiptId)',
  'event SafeInputPrepared(address indexed owner,address indexed consumer,bytes32 indexed handle)',
  'event SafeOrderCreated(address indexed safe,uint256 indexed orderId)',
  'event SafeOrderCancelled(address indexed safe,uint256 indexed orderId,bytes32 encryptedRefund)',
  'event SafeTokenOperatorUpdated(address indexed safe,address indexed token,address indexed operator,uint48 until)',
  'event SafeViewerAdded(address indexed safe,bytes32 indexed handle,address indexed viewer)',
  'event SafeUnwrapRequested(address indexed safe,address indexed token,address indexed recipient,bytes32 unwrapRequestId)',
  'event SafeModuleRevoked(address indexed safe,address indexed module)',
];

export const SAFE_ABI = [
  'event EnabledModule(address indexed module)',
  'event DisabledModule(address indexed module)',
  'function isModuleEnabled(address module) view returns (bool)',
  'function isOwner(address owner) view returns (bool)',
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function enableModule(address module)',
  'function disableModule(address prevModule,address module)',
  'function execTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures) returns (bool success)',
  'function getTransactionHash(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 _nonce) view returns (bytes32)',
];

export const CHAINLINK_FEED_ABI = [
  'function latestRoundData() view returns (uint80 roundId,int256 answer,uint256 startedAt,uint256 updatedAt,uint80 answeredInRound)',
  'function decimals() view returns (uint8)',
  'function description() view returns (string)',
];

export const CHAINLINK_ETH_USD = '0x694AA1769357215DE4FAC081bf1f309aDC325306';
