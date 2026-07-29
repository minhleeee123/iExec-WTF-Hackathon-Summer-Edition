function normalizeHex(value) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function equalJson(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

/**
 * Remapping and output-selection lists can differ when Hardhat merges otherwise
 * independent compilation jobs. Compare the settings that affect executable
 * code; resolved source paths and contents are checked separately.
 */
export function compilerSettingsMatch(localSettings = {}, verifiedSettings = {}) {
  const ignored = new Set(['outputSelection', 'remappings']);
  const keys = new Set([...Object.keys(localSettings), ...Object.keys(verifiedSettings)]);
  return [...keys]
    .filter((key) => !ignored.has(key))
    .every((key) => equalJson(localSettings[key], verifiedSettings[key]));
}

export function verifiedSourcesMatch(localSources = {}, verifiedSources = {}) {
  const entries = Object.entries(verifiedSources);
  return entries.length > 0 && entries.every(([sourceName, verifiedSource]) => (
    typeof verifiedSource?.content === 'string'
    && localSources[sourceName]?.content === verifiedSource.content
  ));
}

export function assessSourcifyReproducibility({
  record,
  buildInfo,
  artifact,
  transactionData,
  runtimeCode,
}) {
  const fullyQualifiedName = `${artifact.inputSourceName}:${artifact.contractName}`;
  const sourcifyExactMatch = (
    record?.match === 'exact_match'
    && record.creationMatch === 'exact_match'
    && record.runtimeMatch === 'exact_match'
  );
  const verifiedCreationMatch = (
    normalizeHex(record?.creationBytecode?.onchainBytecode)
    === normalizeHex(transactionData)
  );
  const verifiedRuntimeMatch = (
    normalizeHex(record?.runtimeBytecode?.onchainBytecode)
    === normalizeHex(runtimeCode)
  );
  const verifiedCompilerMatch = (
    record?.compilation?.compiler === 'solc'
    && record.compilation.compilerVersion === buildInfo?.solcLongVersion
  );
  const verifiedLanguageMatch = (
    record?.compilation?.language === buildInfo?.input?.language
    && record?.stdJsonInput?.language === buildInfo?.input?.language
  );
  const verifiedTargetMatch = (
    record?.compilation?.fullyQualifiedName === fullyQualifiedName
  );
  const verifiedCompilerSettingsMatch = compilerSettingsMatch(
    buildInfo?.input?.settings,
    record?.compilation?.compilerSettings,
  );
  const verifiedSourceInputMatch = verifiedSourcesMatch(
    buildInfo?.input?.sources,
    record?.stdJsonInput?.sources,
  );
  const verifiedSourceReproducibility = (
    sourcifyExactMatch
    && verifiedCreationMatch
    && verifiedRuntimeMatch
    && verifiedCompilerMatch
    && verifiedLanguageMatch
    && verifiedTargetMatch
    && verifiedCompilerSettingsMatch
    && verifiedSourceInputMatch
  );

  return {
    sourcifyExactMatch,
    verifiedCreationMatch,
    verifiedRuntimeMatch,
    verifiedCompilerMatch,
    verifiedLanguageMatch,
    verifiedTargetMatch,
    verifiedCompilerSettingsMatch,
    verifiedSourceInputMatch,
    verifiedSourceReproducibility,
  };
}

export function evaluateTargetVerification({
  constructorArgsMatch,
  executableCreationMatch,
  exactCreationMatch,
  receiptAddressMatch,
  runtimePresent,
  requireExactMetadata,
  allowVerifiedSourceFallback = false,
  sourceEvidence,
}) {
  const baseMatch = constructorArgsMatch && receiptAddressMatch && runtimePresent;
  const localBytecodeMatch = (
    baseMatch
    && executableCreationMatch
    && (!requireExactMetadata || exactCreationMatch)
  );
  const verifiedSourceMatch = (
    baseMatch
    && allowVerifiedSourceFallback
    && sourceEvidence?.verifiedSourceReproducibility === true
  );
  const pass = localBytecodeMatch || verifiedSourceMatch;
  const verificationBasis = localBytecodeMatch
    ? (exactCreationMatch ? 'local-exact-bytecode' : 'local-executable-bytecode')
    : verifiedSourceMatch
      ? 'sourcify-exact-source'
      : 'none';

  return { pass, verificationBasis, localBytecodeMatch, verifiedSourceMatch };
}
