import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { getContractAndGateway } from '../../helper/api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WALLET_PATH = path.join(__dirname, '..', '..', '..', 'wallet');

export const create = async({
    encryptedIdentity,
    uniqueHash,
    override = "false",
    user,
}) => {
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
                .submitTransaction('createIdentity', encryptedIdentity, uniqueHash, override)
                .catch(reject);

        await gateway.disconnect();

        if (!response) return;

        resolve();
        return;
    });
};

export const get = async ({
    user,
    identityId,
}) => {
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
        resolve(identity);
        return;
    });
};
