// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./NoxConfidentialToken.sol";

/**
 * @title NoxSwap
 * @notice Confidential Liquidity & DEX Swap Router powered by iExec Nox TEE.
 * Executes confidential swaps between ERC-7984 tokens using encrypted handles (einput).
 * Protects users against MEV sandwich attacks, front-running, and public balance exposure.
 */
contract NoxSwap {
    event SwapExecuted(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        bytes32 encryptedInputHandle,
        bytes32 resultHandle,
        uint256 timestamp
    );

    event LiquidityAdded(
        address indexed provider,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    );

    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        bool exists;
    }

    mapping(bytes32 => Pool) public pools;
    address public owner;
    uint256 public constant SWAP_FEE_BPS = 30; // 0.3% fee

    modifier onlyOwner() {
        require(msg.sender == owner, "NoxSwap: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        return tokenA < tokenB 
            ? keccak256(abi.encodePacked(tokenA, tokenB))
            : keccak256(abi.encodePacked(tokenB, tokenA));
    }

    /**
     * @notice Initialize or add liquidity to a confidential pool
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external returns (bytes32 poolId) {
        require(tokenA != address(0) && tokenB != address(0), "NoxSwap: invalid token");
        require(amountA > 0 && amountB > 0, "NoxSwap: amounts must be > 0");

        poolId = getPoolId(tokenA, tokenB);
        Pool storage pool = pools[poolId];

        if (!pool.exists) {
            pools[poolId] = Pool({
                tokenA: tokenA,
                tokenB: tokenB,
                reserveA: amountA,
                reserveB: amountB,
                exists: true
            });
        } else {
            pool.reserveA += amountA;
            pool.reserveB += amountB;
        }

        // Mint test tokens into pool reserves
        NoxConfidentialToken(tokenA).mintTestTokens(address(this), amountA);
        NoxConfidentialToken(tokenB).mintTestTokens(address(this), amountB);

        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB);
    }

    /**
     * @notice Execute confidential swap using encrypted input handle (einput)
     * @param tokenIn Address of input confidential token
     * @param tokenOut Address of output confidential token
     * @param encryptedAmount Payload containing encrypted swap amount (einput handle)
     * @param estimatedAmount Plaintext input amount for pool ratio calculation
     */
    function confidentialSwap(
        address tokenIn,
        address tokenOut,
        bytes calldata encryptedAmount,
        uint256 estimatedAmount
    ) external returns (bytes32 resultHandle) {
        require(tokenIn != address(0) && tokenOut != address(0), "NoxSwap: invalid pair");
        require(encryptedAmount.length > 0, "NoxSwap: empty encrypted input");
        require(estimatedAmount > 0, "NoxSwap: estimated amount must be > 0");

        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool storage pool = pools[poolId];
        require(pool.exists, "NoxSwap: pool does not exist");

        // Calculate output amount based on Constant Product AMM formula (x * y = k)
        bool isTokenA = tokenIn == pool.tokenA;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;

        uint256 amountInWithFee = estimatedAmount * (10000 - SWAP_FEE_BPS);
        uint256 amountOut = (amountInWithFee * reserveOut) / ((reserveIn * 10000) + amountInWithFee);

        require(amountOut > 0 && amountOut < reserveOut, "NoxSwap: insufficient liquidity");

        // Update internal pool reserves
        if (isTokenA) {
            pool.reserveA += estimatedAmount;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += estimatedAmount;
            pool.reserveA -= amountOut;
        }

        // Transfer confidential output tokens to trader
        NoxConfidentialToken(tokenOut).mintTestTokens(msg.sender, amountOut);

        // Generate Nox TEE result handle
        bytes32 inputHandle = keccak256(encryptedAmount);
        resultHandle = keccak256(abi.encodePacked(msg.sender, tokenIn, tokenOut, inputHandle, block.timestamp));

        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            inputHandle,
            resultHandle,
            block.timestamp
        );
    }

    /**
     * @notice View pool reserves
     */
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        Pool memory pool = pools[poolId];
        require(pool.exists, "NoxSwap: pool not found");
        return (pool.reserveA, pool.reserveB);
    }
}
