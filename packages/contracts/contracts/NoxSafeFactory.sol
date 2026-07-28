// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {NoxSafeModule} from "./NoxSafeModule.sol";

interface INoxSafeProxyFactory {
    function createProxyWithNonce(
        address singleton,
        bytes memory initializer,
        uint256 saltNonce
    ) external returns (address payable proxy);
}

interface INoxSafeInitializer {
    function setup(
        address[] calldata owners,
        uint256 threshold,
        address to,
        bytes calldata data,
        address fallbackHandler,
        address paymentToken,
        uint256 payment,
        address payable paymentReceiver
    ) external;

    function enableModule(address module) external;
    function isModuleEnabled(address module) external view returns (bool);
    function isOwner(address owner) external view returns (bool);
}

interface INoxSafeModuleBinding {
    function safe() external view returns (address);
}

/**
 * @title NoxSafeFactory
 * @notice Creates one initialized Safe treasury and one bound NoxSafeModule for
 *         each account. The canonical Safe singleton and proxy factory remain
 *         the source of Safe proxy code and ownership semantics.
 *
 * The proxy is intentionally created without an initializer, then initialized
 * in the same transaction after its bound module address exists. No external
 * transaction can interleave and take ownership of the temporary uninitialized
 * proxy. Safe.setup delegate-calls enableModuleDuringSetup, which makes the Safe
 * call its own authorized enableModule entry point.
 */
contract NoxSafeFactory {
    error AlreadyHasSafe(address owner, address safe);
    error InvalidAddress();
    error InvalidLegacySafe();
    error InvalidToken();
    error OnlyDelegateCall();
    error SafeInitializationFailed();

    event NoxSafeCreated(
        address indexed owner,
        address indexed safe,
        address indexed module,
        uint256 saltNonce
    );
    event LegacySafeRegistered(
        address indexed owner,
        address indexed safe,
        address indexed module
    );

    address public immutable safeSingleton;
    address public immutable safeProxyFactory;
    address public immutable router;
    address public immutable orderBook;
    address public immutable noxCompute;

    address private immutable _factoryAddress;
    address[] private _allowedTokens;

    mapping(address owner => address safe) public safeOf;
    mapping(address safe => address module) public moduleOf;
    mapping(address safe => address owner) public registeredOwner;

    constructor(
        address safeSingleton_,
        address safeProxyFactory_,
        address router_,
        address orderBook_,
        address noxCompute_,
        address[] memory allowedTokens_,
        address legacyOwner_,
        address legacySafe_,
        address legacyModule_
    ) {
        if (
            safeSingleton_ == address(0) ||
            safeProxyFactory_ == address(0) ||
            router_ == address(0) ||
            orderBook_ == address(0) ||
            noxCompute_ == address(0)
        ) revert InvalidAddress();
        if (allowedTokens_.length == 0) revert InvalidToken();

        safeSingleton = safeSingleton_;
        safeProxyFactory = safeProxyFactory_;
        router = router_;
        orderBook = orderBook_;
        noxCompute = noxCompute_;
        _factoryAddress = address(this);

        for (uint256 i = 0; i < allowedTokens_.length; i++) {
            if (allowedTokens_[i] == address(0)) revert InvalidToken();
            _allowedTokens.push(allowedTokens_[i]);
        }

        bool hasLegacy = legacyOwner_ != address(0) || legacySafe_ != address(0) || legacyModule_ != address(0);
        if (hasLegacy) {
            if (
                legacyOwner_ == address(0) ||
                legacySafe_ == address(0) ||
                legacyModule_ == address(0) ||
                !INoxSafeInitializer(legacySafe_).isOwner(legacyOwner_) ||
                !INoxSafeInitializer(legacySafe_).isModuleEnabled(legacyModule_) ||
                INoxSafeModuleBinding(legacyModule_).safe() != legacySafe_
            ) revert InvalidLegacySafe();
            safeOf[legacyOwner_] = legacySafe_;
            moduleOf[legacySafe_] = legacyModule_;
            registeredOwner[legacySafe_] = legacyOwner_;
            emit LegacySafeRegistered(legacyOwner_, legacySafe_, legacyModule_);
        }
    }

    function allowedTokens() external view returns (address[] memory) {
        return _allowedTokens;
    }

    function createSafe() external returns (address safe, address module) {
        address existing = safeOf[msg.sender];
        if (existing != address(0)) revert AlreadyHasSafe(msg.sender, existing);

        uint256 saltNonce = uint256(keccak256(abi.encode(block.chainid, address(this), msg.sender)));
        safe = INoxSafeProxyFactory(safeProxyFactory).createProxyWithNonce(
            safeSingleton,
            bytes(""),
            saltNonce
        );
        module = address(new NoxSafeModule(
            safe,
            router,
            orderBook,
            noxCompute,
            _allowedTokens
        ));

        address[] memory owners = new address[](1);
        owners[0] = msg.sender;
        INoxSafeInitializer(safe).setup(
            owners,
            1,
            address(this),
            abi.encodeCall(this.enableModuleDuringSetup, (module)),
            address(0),
            address(0),
            0,
            payable(address(0))
        );

        if (
            !INoxSafeInitializer(safe).isOwner(msg.sender) ||
            !INoxSafeInitializer(safe).isModuleEnabled(module)
        ) revert SafeInitializationFailed();

        safeOf[msg.sender] = safe;
        moduleOf[safe] = module;
        registeredOwner[safe] = msg.sender;
        emit NoxSafeCreated(msg.sender, safe, module, saltNonce);
    }

    /**
     * @dev Called only by Safe.setup through delegatecall. address(this) is the
     *      new Safe in that context, so its authorized enableModule call sees
     *      the Safe itself as msg.sender.
     */
    function enableModuleDuringSetup(address module) external {
        if (address(this) == _factoryAddress) revert OnlyDelegateCall();
        INoxSafeInitializer(address(this)).enableModule(module);
    }
}
