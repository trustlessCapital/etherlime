const assert = require('chai').assert;
const tcpPortUsed = require('tcp-port-used');
const runCmdHandler = require('../utils/spawn-child-process').runCmdHandler;
const killProcessByPID = require('../utils/spawn-child-process').killProcessByPID;
const timeout = require('../../utils/timeout').timeout;
const hookStream = require('../../utils/hookup-standard-output').hookStream;
const ganacheSetupFile = require('../../../cli-commands/ganache/setup.json');
const walletUtil = require('./../utils/wallet');
const find = require('find-process');

const ganacheServerListenCallback = require('../../../cli-commands/ganache/ganache').ganacheServerListenCallback;
const ganacheRun = require('../../../cli-commands/ganache/ganache').run;
const config = require('../../config.json');
const ethers = require('ethers')
const logger = require('../../logger-service/logger-service').logger;
const ganache = require("ganache-cli");
const Billboard = require('../../testContracts/Billboard.json');





const START_SERVER_TIMEOUT = 10000;

const DEFAULT_PORT = ganacheSetupFile.defaultPort;
const SPECIFIC_PORT = 8123;
const RUN_DIRECT_PORT = 8124;
const RUN_FORK_PORT = 8125;

const ADDRESS_START_INDEX = 13;
const ADDRESS_LENGTH = 42;

const PRIVATE_KEY_START_INDEX = 69;
const PRIVATE_KEY_LENGTH = 66;

const FIRST_PRIVATE_KEY = ganacheSetupFile.accounts[0].secretKey;
const FIRST_ACCOUNT_ADDRESS = walletUtil.getAddressByPrivateKey(ganacheSetupFile.accounts[0].secretKey);

const THIRD_PRIVATE_KEY = ganacheSetupFile.accounts[2].secretKey;
const THIRD_ACCOUNT_ADDRESS = walletUtil.getAddressByPrivateKey(ganacheSetupFile.accounts[2].secretKey);

const TENTH_PRIVATE_KEY = ganacheSetupFile.accounts[9].secretKey;
const TENTH_ACCOUNT_ADDRESS = walletUtil.getAddressByPrivateKey(ganacheSetupFile.accounts[9].secretKey);
const NETWORK_FORK_ADDRESS = "https://rinkeby.infura.io/v3/abca6d1110b443b08ef271545f24b80d";
const LOCAL_NETWORK_FORK_ADDRESS = "http://localhost:8545";

let ganacheCommandOutput;
let expectedOutput = 'Listening on';
let forkingExpectedOutput = 'Network is forked from block number';
let localForkingExpectedOutput = 'Etherlime ganache is forked from network';
let childResponse;

describe('Ganache cli command', () => {

	describe('Ganache server used the default port', async () => {
		it('the default port should be used by ganache server', async () => {
			await timeout(START_SERVER_TIMEOUT);

			const defaultPortInUse = await tcpPortUsed.check(DEFAULT_PORT);

			assert.isTrue(defaultPortInUse, `The default port ${DEFAULT_PORT} is free`);
		});
	});

	describe('Run ganache server on specific port', async () => {
		it('should start ganache server on specific port', async () => {

			const portInUse = await tcpPortUsed.check(SPECIFIC_PORT);

			assert.isFalse(portInUse, `The specific port ${SPECIFIC_PORT} is in use`);

			childResponse = await runCmdHandler(`etherlime ganache --port ${SPECIFIC_PORT}`, expectedOutput);

			const portInUseAfterRunningGanache = await tcpPortUsed.check(SPECIFIC_PORT);

			assert.isTrue(portInUseAfterRunningGanache, `The specific port ${SPECIFIC_PORT} is free`);

		});
	});

	describe('Run ganache server and check accounts', async () => {
		it('should start ganache server and validate accounts', async () => {
			childResponse = await runCmdHandler(`etherlime ganache --port ${SPECIFIC_PORT}`, expectedOutput);

			ganacheCommandOutput = childResponse.output;

			const rawAccountsString = ganacheCommandOutput.split(/\r?\n/).slice(0, 10);

			const firstOutputtedAddress = rawAccountsString[0].substr(ADDRESS_START_INDEX, ADDRESS_LENGTH);
			const firstOutputtedPrivateKey = rawAccountsString[0].substr(PRIVATE_KEY_START_INDEX, PRIVATE_KEY_LENGTH);

			assert.equal(firstOutputtedAddress, FIRST_ACCOUNT_ADDRESS, 'There is mismatch of first account address');
			assert.equal(firstOutputtedPrivateKey, FIRST_PRIVATE_KEY, 'There is mismatch of first account private key');

			const thirdOutputtedAddress = rawAccountsString[2].substr(ADDRESS_START_INDEX, ADDRESS_LENGTH);
			const thirdOutputtedPrivateKey = rawAccountsString[2].substr(PRIVATE_KEY_START_INDEX, PRIVATE_KEY_LENGTH);

			assert.equal(thirdOutputtedAddress, THIRD_ACCOUNT_ADDRESS, 'There is mismatch of third account address');
			assert.equal(thirdOutputtedPrivateKey, THIRD_PRIVATE_KEY, 'There is mismatch of third account private key');

			const tenthOutputtedAddress = rawAccountsString[9].substr(ADDRESS_START_INDEX, ADDRESS_LENGTH);
			const tenthOutputtedPrivateKey = rawAccountsString[9].substr(PRIVATE_KEY_START_INDEX, PRIVATE_KEY_LENGTH);

			assert.equal(tenthOutputtedAddress, TENTH_ACCOUNT_ADDRESS, 'There is mismatch of tenth account address');
			assert.equal(tenthOutputtedPrivateKey, TENTH_PRIVATE_KEY, 'There is mismatch of tenth account private key');

		});
	});

	describe('Run ganache server on already used port e.g. the default port', async () => {
		it('should throw if we are trying to start ganache server on used port', async () => {

			const childResponse = await runCmdHandler(`etherlime ganache --port ${DEFAULT_PORT}`, expectedOutput);

			assert.isTrue(childResponse.portInUse, 'The ganache server is running on used port');
		});
	});

	describe('Ganache server listen callback', async () => {
		it('should return and log error if ganache serve callback failed', async () => {

			const errorMessage = 'This message should be logged, if error occurs in callback';
			const err = new Error(errorMessage);
			const logs = [];
			let errorLogged;

			// hook up standard output
			const unhookStdout = hookStream(process.stdout, function (string, encoding, fd) {
				logs.push(string);
			});

			try {
				ganacheServerListenCallback(err);
				unhookStdout();
			} catch (err) {
				unhookStdout();
				console.error(err);
			}

			for (let log of logs) {
				errorLogged = log.includes(errorMessage);

				if (errorLogged) {
					break;
				}
			}

			assert.isTrue(errorLogged, 'The error is not logged. Return statement does not work');


		});
	});

	describe('Ganache server listen callback with accounts', async () => {
		it('should listen with dummy loaded accounts', async () => {
			const dummyBlockchainParams = {
				options: {
					accounts: ganacheSetupFile.accounts
				},
				personal_accounts: {
					secretKey1: ganacheSetupFile.accounts.secretKey,
					secretKey2: ganacheSetupFile.accounts.secretKey,
					secretKey3: ganacheSetupFile.accounts.secretKey,
					secretKey4: ganacheSetupFile.accounts.secretKey,
					secretKey5: ganacheSetupFile.accounts.secretKey,
					secretKey6: ganacheSetupFile.accounts.secretKey,
					secretKey7: ganacheSetupFile.accounts.secretKey,
					secretKey8: ganacheSetupFile.accounts.secretKey,
					secretKey9: ganacheSetupFile.accounts.secretKey,
					secretKey10: ganacheSetupFile.accounts.secretKey,
				}
			};

			const logs = [];
			let isServerListening = false;
			const serverListeningMessageStart = 'Listening on';

			// hook up standard output
			const unhookDummyConsole = hookStream(process.stdout, function (string, encoding, fd) {
				logs.push(string);
			});

			try {
				ganacheServerListenCallback(false, dummyBlockchainParams);
				unhookDummyConsole();
			} catch (err) {
				unhookDummyConsole();
				console.error(err);
			}

			for (let log of logs) {
				isServerListening = log.includes(serverListeningMessageStart);

				if (isServerListening) {
					break;
				}
			}

			assert.isTrue(isServerListening, 'The callback function with accounts - failed');
		});

		it('should run ganache server on passed port', async () => {
			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_DIRECT_PORT}`, expectedOutput);

			const portInUseAfterDirectCallRun = await tcpPortUsed.check(RUN_DIRECT_PORT);

			assert.isTrue(portInUseAfterDirectCallRun, `The specific port ${RUN_DIRECT_PORT} is free`);

		});
	});
	afterEach(async () => {
		if (childResponse && childResponse.process) {
			killProcessByPID(childResponse.process.pid)
			childResponse = '';
		}
	});
});

describe('Ganache fork command', () => {
	describe('Ganache server forking through Infura Provaider - straight test', async () => {
		it('should start ganache server forking from specific network', async () => {
			await timeout(START_SERVER_TIMEOUT);

			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT} --fork https://${config.infuraNetwork}.infura.io/v3/${config.infuraForkAPIKey}`, forkingExpectedOutput);
			const rawOutputNetworkData = childResponse.output.split(/\r?\n/).slice(12, 14);

			const forkedNetwork = rawOutputNetworkData[0].split(/:(.+)/)[1].trim();
			assert.equal(forkedNetwork, NETWORK_FORK_ADDRESS, 'The network that is forked from does not match');

		});


		it('should start ganache server forking from specific block number', async () => {
			await timeout(START_SERVER_TIMEOUT);

			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT} --fork https://${config.infuraNetwork}.infura.io/v3/${config.infuraForkAPIKey}@${config.specificblockNumber}`, forkingExpectedOutput);

			const rawOutputNetworkData = childResponse.output.split(/\r?\n/).slice(12, 14);

			const forkedBlockNumber = rawOutputNetworkData[1].split(/:(.+)/)[1].trim();
			assert.equal(forkedBlockNumber, config.specificblockNumber, 'The block number that the network is forked from, does not match');
		});
	});

	describe('Ganache server forking from local RPC network - straight test', async () => {
		it('should start ganache server forking from specific network', async () => {

			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT} --fork=http://localhost:${DEFAULT_PORT}`, localForkingExpectedOutput);
			const rawOutputNetworkData = childResponse.output.split(/\r?\n/).slice(12, 14);

			const forkedNetwork = rawOutputNetworkData[0].split(/:(.+)/)[1].trim();
			assert.equal(forkedNetwork, LOCAL_NETWORK_FORK_ADDRESS, 'The network that is forked from does not match');

		});
	});

	describe('Ganache server forking reverse test', async () => {
		it('should start normal ganache server when empty parameter for forking is specified', async () => {
			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT} --fork`, expectedOutput);
			const rawOutputNetworkData = childResponse.output.split(/\r?\n/).slice(12, 14).filter(Boolean);

			const forkingParameter = rawOutputNetworkData.length > 0 ? true : false;
			assert.isFalse(forkingParameter, `The forking parameters are not empty`);

		});

		it('should start normal ganache server when no parameter for forking is specified', async () => {
			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT}`, expectedOutput);
			const rawOutputNetworkData = childResponse.output.split(/\r?\n/).slice(12, 14).filter(Boolean);

			const forkingParameter = rawOutputNetworkData.length > 0 ? true : false;
			assert.isFalse(forkingParameter, `The forking parameters are not empty`);

		});
	});

	describe('Ganache server forking initializing wallet test', async () => {
		let infuraProvider;
		let infuraInitializedWallet;
		let balance;

		before(async () => {
			infuraProvider = new ethers.providers.InfuraProvider(config.infuraNetwork, config.infuraForkAPIKey);
			infuraInitializedWallet = new ethers.Wallet(config.infuraPrivateKey, infuraProvider);
			balance = await infuraInitializedWallet.getBalance();
		});

		it('should start ganache server forking from specific network and initialize wallet that exists already in the forked network with the same ballance', async () => {

			childResponse = await runCmdHandler(`etherlime ganache --port=${RUN_FORK_PORT} --fork=https://${config.infuraNetwork}.infura.io/v3/${config.infuraForkAPIKey}`, forkingExpectedOutput);

			const localNetworkToListen = `http://localhost:${RUN_FORK_PORT}`;
			const jsonRpcProvider = new ethers.providers.JsonRpcProvider(localNetworkToListen);
			const forkedWallet = new ethers.Wallet(config.infuraPrivateKey, jsonRpcProvider);
			const balanceInForkedWallet = await forkedWallet.getBalance();

			assert.notDeepEqual(infuraInitializedWallet.provider, forkedWallet.provider, 'The wallet provider from the forked network is deep equal with wallet provider from the network, that the fork is made from');
			assert.deepEqual(infuraInitializedWallet.address, forkedWallet.address, 'The stored walled address from the forked network is not the stored wallet address from the network, that the fork is made from');
			assert.deepEqual(balance, balanceInForkedWallet, 'The balance in the two wallets is not equal');


		});
	});
	afterEach(async () => {
		if (childResponse && childResponse.process) {
			killProcessByPID(childResponse.process.pid)
			childResponse = '';
		}
	});
});
describe('Ganace fork existing contract tests', async () => {
	describe('Fetching contract through the forked network, which is already deployed on the main network', async () => {
		let infuraProvider;
		let deployedContract;
		let deployedContractAddress;
		let deployedContractSlogan;

		let jsonRpcProvider;
		let forkedDeployedContract;
		let forkedDeployedContractAddress;
		let forkedDeployedContractSlogan;
		let forkedWallet;
		let forkedConnectedContract;

		before(async () => {
			infuraProvider = new ethers.providers.InfuraProvider(config.infuraNetwork, config.infuraForkAPIKey);
			deployedContract = new ethers.Contract(config.deployedContractAddress, Billboard.abi, infuraProvider);
			deployedContractAddress = deployedContract.address;
			deployedContractSlogan = await deployedContract.slogan();

			childResponse = await runCmdHandler(`etherlime ganache --port ${RUN_FORK_PORT} --fork https://${config.infuraNetwork}.infura.io/v3/${config.infuraForkAPIKey}`, forkingExpectedOutput);
			const localNetworkToListen = `http://localhost:${RUN_FORK_PORT}`;
			jsonRpcProvider = new ethers.providers.JsonRpcProvider(localNetworkToListen);
			forkedDeployedContract = new ethers.Contract(config.deployedContractAddress, Billboard.abi, jsonRpcProvider);
			forkedDeployedContractAddress = forkedDeployedContract.address;
			forkedDeployedContractSlogan = await forkedDeployedContract.slogan();
			forkedWallet = new ethers.Wallet(config.infuraPrivateKey, jsonRpcProvider);
			forkedConnectedContract = forkedDeployedContract.connect(forkedWallet);

		});
		it('should fetch the same contract in the forked network, that is deployed on the main network', async () => {

			assert.strictEqual(deployedContractAddress, forkedDeployedContractAddress, 'The contracts of the networks are not the same (addresses are different)');
		});
		it('should read smart contract data written in the network before the fork, from the forked network', async () => {

			assert.strictEqual(deployedContractSlogan, forkedDeployedContractSlogan, 'Contracts slogans are not the same');
		});

		it('should be able to send transaction to the already deployed smart contract in the forked network', async () => {
			const newSlogan = 'Ogi naistina li e majstor?';
			const sentTransaction = await forkedConnectedContract.buy(newSlogan, { value: 51 });
			const transactionComplete = await jsonRpcProvider.waitForTransaction(sentTransaction.hash);
			const newBuyedSlogan = await forkedDeployedContract.slogan();
			assert.strictEqual(newSlogan, newBuyedSlogan, 'The slogan of the already deployed smart contract and the new buyed slogan are not the same');

		})

		after(async () => {
			killProcessByPID(childResponse.process.pid);
		});
	});
});