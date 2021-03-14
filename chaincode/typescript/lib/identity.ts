/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context } from 'fabric-contract-api';
import { BlockotusContract } from 'hyperledger-fabric-chaincode-helper';

type CreatorId = string;

type Confirmations = [number, number];

interface IIdentityObject {
    encryptedIdentity: string;
    uniqueHash: string;
}

interface IWithKYC {
    kyc: boolean;
    confirmations: Confirmations;
}

type IdentityObjectWithKYC = IIdentityObject & IWithKYC;

type JobId = string;

interface IJob { jobId: string; }

type JobList = IJob[];

interface IJobResult { 0: number; 1: number; }

type JobResults = IJobResult[];

const CONFIRMATIONS_NEEDED_FOR_KYC = 3;

export class Identity extends BlockotusContract {

    constructor(...args) {
        super(...args);
    }

    public async initLedger() {
        console.log('initLedger');
    }

    /**
     * Cross-contract invokeChaincode() does not support Parent Contract method as far as I know.
     * This is why we duplicate the method here.
     * Because the method is called from Did contract https://github.com/BLOCKOTUS/did
     */
    public async did(ctx: Context, subject: string, method: string, data: string): Promise<string> {
        return this.didRequest(ctx, subject, method, data);
    }

    /**
     * Get an identity.
     * If no key is provided, we use the transaction submitter id (creatorId).
     *
     * @param {string} key
     */
    public async getIdentity(ctx: Context): Promise<string> {
        const params = this.getParams(ctx);

        // get key from function argument
        const key: CreatorId = params.length === 1 ? params[0] : this.getUniqueClientId(ctx);

        // get identity
        const identity = await this.didGet(ctx, key);
        const identityObject: IdentityObject = JSON.parse(identity);
        const withConfirmationsIdentity: IdentityObjectWithKYC = {
            ...identityObject,
            confirmations: [0, 0],
            kyc: false,
        };

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
        const params = this.getParams(ctx, { length: 3 });

        // get params from function argument
        const id: CreatorId = this.getUniqueClientId(ctx);
        const encryptedIdentity: string = params[0];
        const uniqueHash: string = params[1];
        const override: string = params[2];

        // check if uniqueHash exists, terminates if exists
        const hashExists = await this.hashExists(ctx, uniqueHash);
        if (hashExists) { throw new Error(`${uniqueHash} already exists.`); }

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

}
