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

    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);
        
        return rawId.payload.toString('utf8');
    }

    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawId.message);
        
        return rawTs.payload.toString('utf8');
    }

    async exists(ctx, key) {
        const existing = await ctx.stub.getState(key);
        return !existing.toString() ? false : true;
    }

    async queryIdentity(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        
        const key = params.length === 1 ? params[0] : await this.getCreatorId(ctx);

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

        const id = await this.getCreatorId(ctx)
        const encryptedIdentity = params[0];
        const override = params[1];

        if (override !== 'true'){
            const idExists = await this.exists(ctx, id);
            if (idExists) throw new Error(`${id} already exists.`);
        }

        const value = { encryptedIdentity };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
        console.info(`============= END : Create identity ${JSON.stringify(value)} ===========`);
    }

}

module.exports = Identity;
