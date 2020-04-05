/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class Fabidentity extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const identities = [
            {
                registryDate: '2020/04/01 04:20:00 GMT+1',
                nationalId: '2*8*5*3*N',
                nation: 'Spain',
                attributes: {
                    name: 'Daniel',
                    surname: 'Dani',
                    lastname: 'Febrero Martin',
                    gender: 'male',
                    birthdate: '1992/01/01 08:20:00 GMT+1'
                },
            },
            {
                registryDate: '2020/04/01 04:20:00 GMT+1',
                nationalId: '2*8*5*3*N',
                nation: 'Spain',
                attributes: {
                    name: '******',
                    surname: '******',
                    lastname: '******',
                    gender: '******',
                    birthdate: '******'
                },
            }
        ]
            

        for (let i = 0; i < identities.length; i++) {
            identities[i].docType = 'identity';
            await ctx.stub.putState('identity' + i, Buffer.from(JSON.stringify(identities[i])));
            console.info('Added <--> ', identities[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async queryIdentity(ctx, identityNumber) {
        const identityAsBytes = await ctx.stub.getState(identityNumber); // get the identity from chaincode state
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`${identityNumber} does not exist`);
        }
        console.log(identityAsBytes.toString());
        return identityAsBytes.toString();
    }

    async createidentity(ctx, identityNumber, make, model, color, owner) {
        console.info('============= START : Create identity ===========');

        const identity = {
            registryDate,
            nationalId,
            nation,
            attributes,
        };

        await ctx.stub.putState(identityNumber, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : Create identity ===========');
    }

    async queryAllidentities(ctx) {
        const startKey = 'identity0';
        const endKey = 'identity999';
        const allResults = [];
        for await (const {key, value} of ctx.stub.getStateByRange(startKey, endKey)) {
            const strValue = Buffer.from(value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: key, Record: record });
        }
        console.info(allResults);
        return JSON.stringify(allResults);
    }

    async changeidentityOwner(ctx, identityNumber, newOwner) {
        console.info('============= START : changeidentityOwner ===========');

        const identityAsBytes = await ctx.stub.getState(identityNumber); // get the identity from chaincode state
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`${identityNumber} does not exist`);
        }
        const identity = JSON.parse(identityAsBytes.toString());
        identity.owner = newOwner;

        await ctx.stub.putState(identityNumber, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : changeidentityOwner ===========');
    }

}

module.exports = FabIdentity;
