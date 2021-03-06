/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

const CONFIRMATIONS_NEEDED_FOR_KYC = 3;

class Identity extends Contract {
    // "PRIVATE"

    async initLedger() {

    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    validateParams(params, count) {
        if(params.length !== count) throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`);
    }

    /**
     * Get the creatorId (transaction submitter unique id) from the Helper organ.
     */
    async getCreatorId(ctx) {
        const rawId = await ctx.stub.invokeChaincode("helper", ["getCreatorId"], "mychannel");
        if (rawId.status !== 200) throw new Error(rawId.message);
        
        return rawId.payload.toString('utf8');
    }

    /**
     * Get the timestamp from the Helper organ.
     */
    async getTimestamp(ctx) {
        const rawTs = await ctx.stub.invokeChaincode("helper", ["getTimestamp"], "mychannel");
        if (rawTs.status !== 200) throw new Error(rawTs.message);
        
        return rawTs.payload.toString('utf8');
    }

    /**
     * Check if a creatorId already own an identity.
     * 
     * @param {string} key creatorId
     */
    async exists(ctx, key) {
        const existing = await ctx.stub.getState(key);
        return !existing.toString() ? false : true;
    }

    /**
     * Check if a uniqueHash is already registered.
     * Each identity has a deterministic uniqueHash.
     * 
     * @param {string} uniqueHash uniqueHash
     */
    async hashExists(ctx, uniqueHash) {
        const hashIndex = await ctx.stub.createCompositeKey('type~value', ['uniqueHash', uniqueHash]);
        const existing = await ctx.stub.getState(hashIndex);
        return !existing.toString() ? false : true;
    }

    /**
     * Get an identity by creatorId.
     * 
     * @param {string} id creatorId
     */
    async getIdentityById(ctx, id) {
        const rawIdentity = await ctx.stub.getState(id);
        if (!rawIdentity || rawIdentity.length === 0) throw new Error(`${id} does not exist`);

        const identity = rawIdentity.toString();
        return identity;
    }

    // "PUBLIC"
    /**
     * Get an identity.
     * If no key is provided, we use the transaction submitter id (creatorId).
     * 
     * @param {string} key
     */
    async getIdentity(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;

        const key = params.length === 1 ? params[0] : await this.getCreatorId(ctx);

        const identity = await this.getIdentityById(ctx, key);
        const identityObject = JSON.parse(identity);
        var withConfirmationsIdentity = { ...identityObject, confirmations: [0,0], kyc: false};

        // get jobId
        const rawJobList = await ctx.stub.invokeChaincode("job", ["listJobByChaincodeAndKey", "identity", key], "mychannel");
        if (rawJobList.status !== 200) throw new Error(rawJobList.message);
        const jobList = JSON.parse(rawJobList.payload.toString('utf8'));
        if(jobList.length === 0) return JSON.stringify(withConfirmationsIdentity).toString();
        const jobId = jobList[0].jobId;
        
        // get job results
        const rawJobResults = await ctx.stub.invokeChaincode("job", ["getJobResults", jobId], "mychannel");
        if (rawJobResults.status !== 200) throw new Error(rawJobResults.message);
        const jobResults = JSON.parse(rawJobResults.payload.toString('utf8'));
        if(Object.keys(jobResults).length === 0) return JSON.stringify(withConfirmationsIdentity).toString();
        var one = jobResults['1'] ? jobResults['1'] : 0;
        var zero = jobResults['0'] ? jobResults['0'] : 0;
        var kyc = one >= CONFIRMATIONS_NEEDED_FOR_KYC && (one/(one+zero)) >= (5/6) ? true : false;
        const confirmations = [one, (zero + one)];
        const idWithConfirmations = { ...identityObject, confirmations, kyc};

        return JSON.stringify(idWithConfirmations).toString();
    }

   /**
     * Creates an identity.
     * 
     * @param {string} encryptedIdentity
     * @param {string} uniqueHash
     * @param {string} override
     */
    async createIdentity(ctx) {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 3);

        const id = await this.getCreatorId(ctx);
        const encryptedIdentity = params[0];
        const uniqueHash = params[1];
        const override = params[2];

        const hashExists = await this.hashExists(ctx, uniqueHash);
        if (hashExists) throw new Error(`${uniqueHash} already exists.`);

        if (override !== 'true'){
            const idExists = await this.exists(ctx, id);
            if (idExists) throw new Error(`${id} already exists.`);
        }

        // create uniqueHash index
        const hashIndex = await ctx.stub.createCompositeKey('type~value', ['uniqueHash', uniqueHash]);
        await ctx.stub.putState(hashIndex, Buffer.from('\u0000'));

        // create identity
        const value = { encryptedIdentity, uniqueHash };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
    }
}

module.exports = Identity;
