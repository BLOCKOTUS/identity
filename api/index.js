/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { getContractAndGateway } = require('../../helper/api');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', 'wallet');

async function create({
	encryptedIdentity,
	override = "false",
	user
}) {
	return new Promise(async (resolve, reject) => {
		// create wallet
		const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await 
			getContractAndGateway({username: user.username, chaincode: 'identity', contract: 'Identity'})
				.catch(reject);

		var response = await 
			contract
				.submitTransaction('createIdentity', encryptedIdentity, override)
				.catch(reject);

		console.log('Transaction has been submitted', response);

		await gateway.disconnect();
		
		resolve();
		
		return;
	})
}


module.exports = {
	create,
}