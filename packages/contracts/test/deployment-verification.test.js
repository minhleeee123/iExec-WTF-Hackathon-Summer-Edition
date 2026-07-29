import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessSourcifyReproducibility,
  evaluateTargetVerification,
} from '../scripts/lib/deployment-verification.js';

const artifact = {
  contractName: 'NoxSafeFactory',
  inputSourceName: 'project/contracts/NoxSafeFactory.sol',
};
const buildInfo = {
  solcLongVersion: '0.8.35+commit.47b9dedd',
  input: {
    language: 'Solidity',
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi'] } },
      remappings: ['project/:dependency/=npm/dependency@1/'],
    },
    sources: {
      'project/contracts/NoxSafeFactory.sol': { content: 'contract NoxSafeFactory {}' },
      'project/contracts/NoxSafeModule.sol': { content: 'contract NoxSafeModule {}' },
      'project/contracts/Unrelated.sol': { content: 'contract Unrelated {}' },
    },
  },
};
const record = {
  match: 'exact_match',
  creationMatch: 'exact_match',
  runtimeMatch: 'exact_match',
  compilation: {
    language: 'Solidity',
    compiler: 'solc',
    compilerVersion: buildInfo.solcLongVersion,
    compilerSettings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      remappings: [],
    },
    fullyQualifiedName: 'project/contracts/NoxSafeFactory.sol:NoxSafeFactory',
  },
  stdJsonInput: {
    language: 'Solidity',
    sources: {
      'project/contracts/NoxSafeFactory.sol': { content: 'contract NoxSafeFactory {}' },
      'project/contracts/NoxSafeModule.sol': { content: 'contract NoxSafeModule {}' },
    },
  },
  creationBytecode: { onchainBytecode: '0x6001' },
  runtimeBytecode: { onchainBytecode: '0x6002' },
};

test('Sourcify evidence tolerates a larger clean-build job but requires identical target sources', () => {
  const evidence = assessSourcifyReproducibility({
    record,
    buildInfo,
    artifact,
    transactionData: '0x6001',
    runtimeCode: '0x6002',
  });
  assert.equal(evidence.verifiedSourceReproducibility, true);

  const driftedBuild = structuredClone(buildInfo);
  driftedBuild.input.sources['project/contracts/NoxSafeModule.sol'].content += ' // drift';
  const drifted = assessSourcifyReproducibility({
    record,
    buildInfo: driftedBuild,
    artifact,
    transactionData: '0x6001',
    runtimeCode: '0x6002',
  });
  assert.equal(drifted.verifiedSourceInputMatch, false);
  assert.equal(drifted.verifiedSourceReproducibility, false);

  const settingsDriftBuild = structuredClone(buildInfo);
  settingsDriftBuild.input.settings.optimizer.runs = 999;
  const settingsDrift = assessSourcifyReproducibility({
    record,
    buildInfo: settingsDriftBuild,
    artifact,
    transactionData: '0x6001',
    runtimeCode: '0x6002',
  });
  assert.equal(settingsDrift.verifiedCompilerSettingsMatch, false);
  assert.equal(settingsDrift.verifiedSourceReproducibility, false);
});

test('exact Sourcify source evidence can explain nested metadata drift without hiding source drift', () => {
  const sourceEvidence = assessSourcifyReproducibility({
    record,
    buildInfo,
    artifact,
    transactionData: '0x6001',
    runtimeCode: '0x6002',
  });
  const verified = evaluateTargetVerification({
    constructorArgsMatch: true,
    executableCreationMatch: false,
    exactCreationMatch: false,
    receiptAddressMatch: true,
    runtimePresent: true,
    requireExactMetadata: true,
    allowVerifiedSourceFallback: true,
    sourceEvidence,
  });
  assert.equal(verified.pass, true);
  assert.equal(verified.verificationBasis, 'sourcify-exact-source');
  assert.equal(verified.localBytecodeMatch, false);

  const rejected = evaluateTargetVerification({
    constructorArgsMatch: true,
    executableCreationMatch: false,
    exactCreationMatch: false,
    receiptAddressMatch: true,
    runtimePresent: true,
    requireExactMetadata: true,
    allowVerifiedSourceFallback: true,
    sourceEvidence: { verifiedSourceReproducibility: false },
  });
  assert.equal(rejected.pass, false);
});
