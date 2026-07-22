// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {
    Nox,
    euint256,
    externalEuint256
} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title NoxSwap
/// @notice Constant-product AMM whose amounts and reserves are Nox encrypted handles.
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
        uint64 timestamp;
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
        uint256 receiptId
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
        bytes calldata inputProof
    ) external returns (euint256 encryptedAmountOut, uint256 receiptId) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        Pool storage pool = _pools[poolId];
        require(pool.exists, "NoxSwap: pool not found");

        euint256 requestedAmountIn = Nox.fromExternal(encryptedAmountIn, inputProof);
        Nox.allowTransient(requestedAmountIn, tokenIn);
        euint256 receivedAmountIn = IERC7984(tokenIn).confidentialTransferFrom(
            msg.sender,
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

        Nox.allowTransient(quotedAmountOut, tokenOut);
        encryptedAmountOut = IERC7984(tokenOut).confidentialTransfer(
            msg.sender,
            quotedAmountOut
        );

        if (zeroForOne) {
            pool.reserve0 = Nox.add(pool.reserve0, receivedAmountIn);
            pool.reserve1 = Nox.sub(pool.reserve1, encryptedAmountOut);
        } else {
            pool.reserve1 = Nox.add(pool.reserve1, receivedAmountIn);
            pool.reserve0 = Nox.sub(pool.reserve0, encryptedAmountOut);
        }
        _persistPool(pool);

        receiptId = nextReceiptId++;
        bytes32 inputHandle = euint256.unwrap(receivedAmountIn);
        bytes32 outputHandle = euint256.unwrap(encryptedAmountOut);
        swapReceipts[receiptId] = SwapReceipt({
            trader: msg.sender,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            encryptedInput: inputHandle,
            encryptedOutput: outputHandle,
            timestamp: uint64(block.timestamp)
        });
        _safeMint(msg.sender, receiptId);

        emit SwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            receivedAmountIn,
            encryptedAmountOut,
            receiptId
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
            '</text><text x="52" y="132" font-family="monospace" font-size="18">Ethereum Sepolia</text>',
            '<text x="52" y="184" font-family="monospace" font-size="15">Input handle: ',
            Strings.toHexString(uint256(receipt.encryptedInput), 32),
            '</text><text x="52" y="226" font-family="monospace" font-size="15">Output handle: ',
            Strings.toHexString(uint256(receipt.encryptedOutput), 32),
            '</text><text x="52" y="292" font-family="monospace" font-size="16">Powered by iExec Nox</text></svg>'
        );
        string memory json = string.concat(
            '{"name":"NoxSwap Confidential Receipt #',
            tokenId.toString(),
            '","description":"On-chain receipt for a confidential NoxSwap settlement.","image":"data:image/svg+xml;base64,',
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
