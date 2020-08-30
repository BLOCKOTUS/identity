/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'wallet');
const CCP_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..', 'network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

async function getContractAndGateway({username, contract}) {
	// load the network configuration
	const ccp = JSON.parse(fs.readFileSync(CCP_PATH, 'utf8'));

	// Create a new file system based wallet for managing identities.
	const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);

	// Check to see if we've already enrolled the user.
	const identity = await wallet.get(username);
	if (!identity) {
		console.log(`An identity for the user "${username}" does not exist in the wallet`);
		return {};
	}

	// Create a new gateway for connecting to our peer node.
	const gateway = new Gateway();
	await gateway.connect(ccp, { identity, discovery: { enabled: true, asLocalhost: true } });

	// Get the network (channel) our contract is deployed to.
	const network = await gateway.getNetwork('mychannel');

	// Get the contract from the network.
	return {contract: network.getContract('identity', contract), gateway};
}


async function create({
	encryptedIdentity,
	user
}) {
	try{
		// create wallet
		const walletPath = path.join(__dirname, '../../../../../wallet', `${user.username}.id`);
		fs.writeFileSync(walletPath, JSON.stringify(user.wallet))

		// get contract, submit transaction and disconnect
		var {contract, gateway} = await getContractAndGateway({username: user.username, contract: 'Identity'});
		var response = await contract.submitTransaction('createIdentity', encryptedIdentity);
		console.log('Transaction has been submitted', response);
		await gateway.disconnect();
	
		return;
	}catch(e){
		console.log('ERROR: ', e)
	}
}


module.exports = {
	create,
}