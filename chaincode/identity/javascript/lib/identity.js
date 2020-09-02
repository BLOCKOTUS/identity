/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class Identity extends Contract {

    async initLedger(ctx) {
      
    }

    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    getCreatorId(ctx) {
        const clientId = ctx.clientIdentity.id;
        const mspId = ctx.clientIdentity.mspId;
        const id = `${mspId}::${clientId}`;
        return id;
    }

    getTimestamp(ctx) {
        const timestamp = ctx.stub.getTxTimestamp();
        return `${timestamp.seconds}${timestamp.nanos}`;

    }

    async exists(ctx, key) {
        const existing = await ctx.stub.getState(key);
        return existing.toString();
    }

    async queryIdentity(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        
        const key = params.length === 1 ? params[0] : this.getCreatorId(ctx);

        const identityAsBytes = await ctx.stub.getState(key);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`${key} does not exist`);
        }

        return identityAsBytes.toString();
    }

    // params[0]: encryptedIdentity
    // params[1]: override
    async createIdentity(ctx) {
        console.info('============= START : Create identity ===========');

        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const id = this.getCreatorId(ctx)
        const encryptedIdentity = params[0];
        const override = params[1];

        if (override !== 'true'){
            let exists = await this.exists(ctx, id);
            if (exists) throw new Error(`${id} already exists.`);
        }

        const value = { encryptedIdentity };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
        console.info(`============= END : Create identity ${JSON.stringify(value)} ===========`);
    }

}

module.exports = Identity;
