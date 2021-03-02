import fs from 'fs';
import path from 'path';

import { getContractAndGateway } from '../../../helper/api/dist/index.js';

const WALLET_PATH = path.join(__dirname, '..', '..', '..', '..', 'wallet');

/**
 * Creates an identity on the network.
 * Each indentity is unique (uniqueHash).
 * A user can choose to override his identity.
 */
export const create = async({
    encryptedIdentity,
    uniqueHash,
    override = 'false',
    user,
}) => {
    return new Promise (async (resolve, reject) => {
        // create wallet
        const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
        fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

        // get contract, submit transaction and disconnect
        const {contract, gateway} = await
            getContractAndGateway({user, chaincode: 'identity', contract: 'Identity'})
                .catch(reject);

        if (!contract || !gateway) { return; }

        const response = await
            contract
                .submitTransaction('createIdentity', encryptedIdentity, uniqueHash, override)
                .catch(reject);

        await gateway.disconnect();

        if (!response) { return; }

        resolve();
        return;
    });
};

/**
 * Retrieves an identity from the network.
 */
export const get = async ({
    user,
    identityId,
}) => {
    return new Promise(async (resolve, reject) => {
        // create wallet
        const walletPath = path.join(WALLET_PATH, `${user.username}.id`);
        fs.writeFileSync(walletPath, JSON.stringify(user.wallet));

        // get contract, submit transaction and disconnect
        const {contract, gateway} = await
            getContractAndGateway({user, chaincode: 'identity', contract: 'Identity'})
                .catch(reject);

        if (!contract || !gateway) { return; }

        const response =
            identityId
            ? await contract
                .submitTransaction('getIdentity', identityId)
                .catch(reject)
            : await contract
                .submitTransaction('getIdentity')
                .catch(reject);

        // disconnect
        await gateway.disconnect();

        if (!response) { return; }

        const identity = JSON.parse(response.toString('utf8'));
        resolve(identity);
        return;
    });
};
