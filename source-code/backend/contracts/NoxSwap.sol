// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {
    Nox,
    ebool,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title NoxSwap
/// @notice Multi-pool AMM with encrypted amounts, reserves, slippage checks, and refunds.
contract NoxSwap is ERC721, Ownable {
    using Strings for uint256;

    uint256 public constant FEE_NUMERATOR = 9_970;
    uint256 public constant FEE_DENOMINATOR = 10_000;

    struct Pool {
        IERC7984 token0;
        IERC7984 token1;
        euint256 reserve0;
        euint256 reserve1;
        bool exists;
    }

    struct SwapReceipt {
        address trader;
        address tokenIn;
        address tokenOut;
        bytes32 encryptedInput;
        bytes32 encryptedOutput;
        bytes32 encryptedRefund;
        uint64 timestamp;
        uint64 deadline;
    }

    mapping(bytes32 poolId => Pool) private _pools;
    mapping(uint256 receiptId => SwapReceipt) public swapReceipts;
    uint256 public nextReceiptId = 1;

    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        address indexed token0,
        address token1,
        euint256 amount0,
        euint256 amount1
    );
    event SwapExecuted(
        address indexed trader,
        address indexed tokenIn,
        address indexed tokenOut,
        euint256 encryptedInput,
        euint256 encryptedOutput,
        euint256 encryptedRefund,
        uint256 receiptId,
        uint64 deadline
    );

    constructor() ERC721("NoxSwap Confidential Receipt", "NOX-R") Ownable(msg.sender) {}

    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        require(tokenA != tokenB, "NoxSwap: identical tokens");
        return tokenA < tokenB
            ? keccak256(abi.encode(tokenA, tokenB))
            : keccak256(abi.encode(tokenB, tokenA));
    }

    function getPoolHandles(
        address tokenA,
        address tokenB
    ) external view returns (address token0, address token1, bytes32 reserve0, bytes32 reserve1) {
        Pool storage pool = _pools[getPoolId(tokenA, tokenB)];
        require(pool.exists, "NoxSwap: pool not found");
        return (
            address(pool.token0),
            address(pool.token1),
            euint256.unwrap(pool.reserve0),
            euint256.unwrap(pool.reserve1)
        );
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        externalEuint256 encryptedAmountA,
        bytes calldata proofA,
        externalEuint256 encryptedAmountB,
        bytes calldata proofB
    ) external returns (bytes32 poolId) {
        require(tokenA != address(0) && tokenB != address(0), "NoxSwap: invalid token");
        poolId = getPoolId(tokenA, tokenB);

        euint256 requestedA = Nox.fromExternal(encryptedAmountA, proofA);
        euint256 requestedB = Nox.fromExternal(encryptedAmountB, proofB);
        Nox.allowTransient(requestedA, tokenA);
        Nox.allowTransient(requestedB, tokenB);
        euint256 receivedA = IERC7984(tokenA).confidentialTransferFrom(
            msg.sender,
            address(this),
            requestedA
        );
        euint256 receivedB = IERC7984(tokenB).confidentialTransferFrom(
            msg.sender,
            address(this),
            requestedB
        );

        Pool storage pool = _pools[poolId];
        bool ordered = tokenA < tokenB;
        euint256 amount0 = ordered ? receivedA : receivedB;
        euint256 amount1 = ordered ? receivedB : receivedA;
        if (!pool.exists) {
            pool.token0 = IERC7984(ordered ? tokenA : tokenB);
            pool.token1 = IERC7984(ordered ? tokenB : tokenA);
            pool.reserve0 = amount0;
            pool.reserve1 = amount1;
            pool.exists = true;
        } else {
            pool.reserve0 = Nox.add(pool.reserve0, amount0);
            pool.reserve1 = Nox.add(pool.reserve1, amount1);
        }

        _persistPool(pool);
        emit LiquidityAdded(
            poolId,
            msg.sender,
            address(pool.token0),
            address(pool.token1),
            amount0,
            amount1
        );
    }

    function confidentialSwap(
        address tokenIn,
        address tokenOut,
        externalEuint256 encryptedAmountIn,
        bytes calldata inputProof,
        externalEuint256 encryptedMinOut,
        bytes calldata minOutProof,
        uint64 deadline
    ) external returns (euint256 encryptedAmountOut, euint256 encryptedRefund, uint256 receiptId) {
        euint256 requestedAmountIn = Nox.fromExternal(encryptedAmountIn, inputProof);
        euint256 minimumAmountOut = Nox.fromExternal(encryptedMinOut, minOutProof);
        return _settleSwap(
            msg.sender,
            msg.sender,
            msg.sender,
            msg.sender,
            tokenIn,
            tokenOut,
            requestedAmountIn,
            minimumAmountOut,
            deadline
        );
    }

    /// @notice Composable settlement for contracts that own and authorize persistent Nox handles.
    function confidentialSwapAuthorized(
        address tokenIn,
        address tokenOut,
        euint256 encryptedAmountIn,
        euint256 encryptedMinOut,
        address recipient,
        address refundRecipient,
        address receiptOwner,
        uint64 deadline
    ) external returns (euint256 encryptedAmountOut, euint256 encryptedRefund, uint256 receiptId) {
        require(Nox.isAllowed(encryptedAmountIn, address(this)), "NoxSwap: input not authorized");
        require(Nox.isAllowed(encryptedMinOut, address(this)), "NoxSwap: minOut not authorized");
        return _settleSwap(
            msg.sender,
            recipient,
            refundRecipient,
            receiptOwner,
            tokenIn,
            tokenOut,
            encryptedAmountIn,
            encryptedMinOut,
            deadline
        );
    }

    function _settleSwap(
        address payer,
        address recipient,
        address refundRecipient,
        address receiptOwner,
        address tokenIn,
        address tokenOut,
        euint256 requestedAmountIn,
        euint256 minimumAmountOut,
        uint64 deadline
    ) private returns (euint256 encryptedAmountOut, euint256 encryptedRefund, uint256 receiptId) {
        require(block.timestamp <= deadline, "NoxSwap: expired");
        require(
            recipient != address(0) && refundRecipient != address(0) && receiptOwner != address(0),
            "NoxSwap: invalid recipient"
        );
        Pool storage pool = _pools[getPoolId(tokenIn, tokenOut)];
        require(pool.exists, "NoxSwap: pool not found");

        Nox.allowTransient(requestedAmountIn, tokenIn);
        euint256 receivedAmountIn = IERC7984(tokenIn).confidentialTransferFrom(
            payer,
            address(this),
            requestedAmountIn
        );

        bool zeroForOne = tokenIn == address(pool.token0);
        euint256 reserveIn = zeroForOne ? pool.reserve0 : pool.reserve1;
        euint256 reserveOut = zeroForOne ? pool.reserve1 : pool.reserve0;
        euint256 feeAdjusted = Nox.div(
            Nox.mul(receivedAmountIn, Nox.toEuint256(FEE_NUMERATOR)),
            Nox.toEuint256(FEE_DENOMINATOR)
        );
        euint256 quotedAmountOut = Nox.div(
            Nox.mul(feeAdjusted, reserveOut),
            Nox.add(reserveIn, feeAdjusted)
        );

        ebool meetsMinimum = Nox.ge(quotedAmountOut, minimumAmountOut);
        euint256 zero = Nox.toEuint256(0);
        euint256 selectedOutput = Nox.select(meetsMinimum, quotedAmountOut, zero);
        euint256 selectedRefund = Nox.select(meetsMinimum, zero, receivedAmountIn);

        Nox.allowTransient(selectedOutput, tokenOut);
        encryptedAmountOut = IERC7984(tokenOut).confidentialTransfer(recipient, selectedOutput);
        Nox.allowTransient(selectedRefund, tokenIn);
        encryptedRefund = IERC7984(tokenIn).confidentialTransfer(
            refundRecipient,
            selectedRefund
        );
        euint256 acceptedAmountIn = Nox.sub(receivedAmountIn, encryptedRefund);

        if (zeroForOne) {
            pool.reserve0 = Nox.add(pool.reserve0, acceptedAmountIn);
            pool.reserve1 = Nox.sub(pool.reserve1, encryptedAmountOut);
        } else {
            pool.reserve1 = Nox.add(pool.reserve1, acceptedAmountIn);
            pool.reserve0 = Nox.sub(pool.reserve0, encryptedAmountOut);
        }
        _persistPool(pool);
        Nox.allow(receivedAmountIn, receiptOwner);

        receiptId = nextReceiptId++;
        swapReceipts[receiptId] = SwapReceipt({
            trader: receiptOwner,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            encryptedInput: euint256.unwrap(receivedAmountIn),
            encryptedOutput: euint256.unwrap(encryptedAmountOut),
            encryptedRefund: euint256.unwrap(encryptedRefund),
            timestamp: uint64(block.timestamp),
            deadline: deadline
        });
        _safeMint(receiptOwner, receiptId);
        emit SwapExecuted(
            receiptOwner,
            tokenIn,
            tokenOut,
            receivedAmountIn,
            encryptedAmountOut,
            encryptedRefund,
            receiptId,
            deadline
        );
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        SwapReceipt memory receipt = swapReceipts[tokenId];
        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">',
            '<rect width="640" height="360" fill="#111"/><rect x="24" y="24" width="592" height="312" rx="8" fill="#ffde59" stroke="#fff" stroke-width="3"/>',
            '<text x="52" y="82" font-family="monospace" font-size="30" font-weight="700">NoxSwap Receipt #',
            tokenId.toString(),
            '</text><text x="52" y="132" font-family="monospace" font-size="18">Protected confidential settlement</text>',
            '<text x="52" y="184" font-family="monospace" font-size="15">Output: ',
            Strings.toHexString(uint256(receipt.encryptedOutput), 32),
            '</text><text x="52" y="226" font-family="monospace" font-size="15">Refund: ',
            Strings.toHexString(uint256(receipt.encryptedRefund), 32),
            '</text><text x="52" y="292" font-family="monospace" font-size="16">Powered by iExec Nox</text></svg>'
        );
        string memory json = string.concat(
            '{"name":"NoxSwap Confidential Receipt #',
            tokenId.toString(),
            '","description":"On-chain receipt for an encrypted minimum-output settlement.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '"}'
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _persistPool(Pool storage pool) private {
        Nox.allowThis(pool.reserve0);
        Nox.allowThis(pool.reserve1);
        Nox.allow(pool.reserve0, owner());
        Nox.allow(pool.reserve1, owner());
    }
}
