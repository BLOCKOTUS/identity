/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context, Contract } from 'fabric-contract-api';

type CreatorId = string;

type Confirmations = [number, number];

type IdentityObject = {
    encryptedIdentity: string;
    uniqueHash: string;
};

type WithKYC = {
    kyc: boolean;
    confirmations: Confirmations;
}

type IdentityObjectWithKYC = IdentityObject & WithKYC;

type JobId = string;

type Job = { jobId: string };

type JobList = Array<Job>;

type JobResult = { 0: number; 1: number };

type JobResults = Array<JobResult>;

const CONFIRMATIONS_NEEDED_FOR_KYC = 3;

export class Identity extends Contract {

    public async initLedger() {
        console.log('initLedger');
    }

    /**
     * Get an identity.
     * If no key is provided, we use the transaction submitter id (creatorId).
     * 
     * @param {string} key
     */
    public async getIdentity(ctx: Context): Promise<string> {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;

        // get key from function argument
        const key: CreatorId = params.length === 1 ? params[0] : await this.getCreatorId(ctx);

        // get identity
        const identity = await this.getIdentityById(ctx, key);
        const identityObject: IdentityObject = JSON.parse(identity);
        const withConfirmationsIdentity: IdentityObjectWithKYC = { ...identityObject, confirmations: [0, 0], kyc: false };

        // get jobId of the identity verification job
        const rawJobList = await ctx.stub.invokeChaincode('job', ['listJobByChaincodeAndKey', 'identity', key], 'mychannel');
        if (rawJobList.status !== 200) { throw new Error(rawJobList.message); }
        const jobList: JobList = JSON.parse(rawJobList.payload.toString());
        if (jobList.length === 0) { return JSON.stringify(withConfirmationsIdentity).toString(); }
        const jobId: JobId = jobList[0].jobId;

        // get job results
        const rawJobResults = await ctx.stub.invokeChaincode('job', ['getJobResults', jobId], 'mychannel');
        if (rawJobResults.status !== 200) { throw new Error(rawJobResults.message); }
        const jobResults: JobResults = JSON.parse(rawJobResults.payload.toString());
        if (Object.keys(jobResults).length === 0) { return JSON.stringify(withConfirmationsIdentity).toString(); }

        // construct confirmations and kyc
        const varone = jobResults['1'] ? jobResults['1'] : 0;
        const varzero = jobResults['0'] ? jobResults['0'] : 0;
        const kyc = varone >= CONFIRMATIONS_NEEDED_FOR_KYC && (varone / (varone + varzero)) >= (5 / 6) ? true : false;
        const confirmations: Confirmations = [varone, (varzero + varone)];
        const idWithConfirmations = { ...identityObject, confirmations, kyc };

        return JSON.stringify(idWithConfirmations).toString();
    }

    /**
     * Creates an identity.
     * 
     * @param {string} encryptedIdentity
     * @param {string} uniqueHash
     * @param {string} override
     */
    public async createIdentity(ctx: Context): Promise<void> {
        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 3);

        // get params from function argument
        const id: CreatorId = await this.getCreatorId(ctx);
        const encryptedIdentity: string = params[0];
        const uniqueHash: string = params[1];
        const override: string = params[2];

        // check if uniqueHash exists, terminates if exists
        const hashExists = await this.hashExists(ctx, uniqueHash);
        if (hashExists) throw new Error(`${uniqueHash} already exists.`);

        // check if the user already registered an identity and prevent overriding if not explicitely specified
        if (override !== 'true') {
            const idExists = await this.exists(ctx, id);
            if (idExists) { throw new Error(`${id} already exists.`); }
        }

        // create uniqueHash index
        const hashIndex = await ctx.stub.createCompositeKey('type~value', ['uniqueHash', uniqueHash]);
        await ctx.stub.putState(hashIndex, Buffer.from('\u0000'));

        // create identity
        const value = { encryptedIdentity, uniqueHash };
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
    }

    /**
     * Validate the params received as arguments by a public functions.
     * Params are stored in the Context.
     * 
     * @param {string[]} params params received by a pubic function
     * @param {number} count number of params expected
     */
    private validateParams(params: string[], count: number): void {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    /**
     * Get the creatorId (transaction submitter unique id) from the Helper organ.
     */
    private async getCreatorId(ctx: Context): Promise<string> {
        const rawId = await ctx.stub.invokeChaincode('helper', ['getCreatorId'], 'mychannel');
        if (rawId.status !== 200) { throw new Error(rawId.message); }
        return rawId.payload.toString();
    }

    /**
     * Get the timestamp from the Helper organ.
     */
    private async getTimestamp(ctx: Context): Promise<string> {
        const rawTs = await ctx.stub.invokeChaincode('helper', ['getTimestamp'], 'mychannel');
        if (rawTs.status !== 200) { throw new Error(rawTs.message); }
        return rawTs.payload.toString();
    }

    /**
     * Check if a creatorId already own an identity.
     * 
     * @param {string} key creatorId
     */
    private async exists(ctx: Context, key: string): Promise<boolean> {
        const existing = await ctx.stub.getState(key);
        return !existing.toString() ? false : true;
    }

    /**
     * Check if a uniqueHash is already registered.
     * Each identity has a deterministic uniqueHash.
     * 
     * @param {string} uniqueHash uniqueHash
     */
    private async hashExists(ctx: Context, uniqueHash: string): Promise<boolean> {
        const hashIndex = await ctx.stub.createCompositeKey('type~value', ['uniqueHash', uniqueHash]);
        const existing = await ctx.stub.getState(hashIndex);
        return !existing.toString() ? false : true;
    }

    /**
     * Get an identity by creatorId.
     * 
     * @param {string} id creatorId
     */
    private async getIdentityById(ctx: Context, id: string): Promise<string> {
        const rawIdentity = await ctx.stub.getState(id);
        if (!rawIdentity || rawIdentity.length === 0) { throw new Error(`${id} does not exist`); }

        const identity = rawIdentity.toString();
        return identity;
    }
}
