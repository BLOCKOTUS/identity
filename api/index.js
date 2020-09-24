const fs = require('fs');
const path = require('path');

const { getContractAndGateway } = require('../../helper/api');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', 'wallet');

async function create({
	encryptedIdentity,
	override = "false",
	user,
}) {
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise (async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'identity', contract: 'Identity'})
				.catch(reject);

		if (!contract || !gateway) return;

		var response = await 
			contract
				.submitTransaction('createIdentity', encryptedIdentity, override)
				.catch(reject);

		await gateway.disconnect();

		if (!response) return;

		console.log('Transaction has been submitted', response);
		resolve();
		return;
	});
}

async function get({
	user,
	identityId,
}) {
	/* eslint-disable-next-line no-async-promise-executor */ /* eslint-disable-next-line no-undef */
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await
			getContractAndGateway({username: user.username, chaincode: 'identity', contract: 'Identity'})
				.catch(reject);

		if (!contract || !gateway) return;
		
		var response = 
			identityId
			? await contract
				.submitTransaction('getIdentity', identityId)
				.catch(reject)
			: await contract
				.submitTransaction('getIdentity')
				.catch(reject);

		//disconnect
		await gateway.disconnect();

		if (!response) return;

		const identity = JSON.parse(response.toString('utf8'));
		
		console.log('Transaction has been submitted');
		resolve(identity);
		return;
	});
}


module.exports = {
	create,
	get,
};
