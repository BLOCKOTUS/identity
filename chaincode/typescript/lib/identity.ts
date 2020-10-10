/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

import { Context, Contract } from 'fabric-contract-api';

const CONFIRMATIONS_NEEDED_FOR_KYC = 3;

export class Identity extends Contract {

    public async initLedger() {
        console.log('initLedger');
    }

    public async getIdentity(ctx: Context) {
        console.info('============= Get identity ===========');

        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;

        const key = params.length === 1 ? params[0] : await this.getCreatorId(ctx);

        const identity = await this.getIdentityById(ctx, key);
        const identityObject = JSON.parse(identity);
        const withConfirmationsIdentity = { ...identityObject, confirmations: [0, 0], kyc: false };

        // get jobId
        const rawJobList = await ctx.stub.invokeChaincode('job', ['listJobByChaincodeAndKey', 'identity', key], 'mychannel');
        if (rawJobList.status !== 200) { throw new Error(rawJobList.message); }
        const jobList = JSON.parse(rawJobList.payload.toString());
        if (jobList.length === 0) { return JSON.stringify(withConfirmationsIdentity).toString(); }
        const jobId = jobList[0].jobId;

        // get job results
        const rawJobResults = await ctx.stub.invokeChaincode('job', ['getJobResults', jobId], 'mychannel');
        if (rawJobResults.status !== 200) { throw new Error(rawJobResults.message); }
        const jobResults = JSON.parse(rawJobResults.payload.toString());
        if (Object.keys(jobResults).length === 0) { return JSON.stringify(withConfirmationsIdentity).toString(); }
        const varone = jobResults['1'] ? jobResults['1'] : 0;
        const varzero = jobResults['0'] ? jobResults['0'] : 0;
        const kyc = varone >= CONFIRMATIONS_NEEDED_FOR_KYC && (varone / (varone + varzero)) >= (5 / 6) ? true : false;
        const confirmations = [varone, (varzero + varone)];
        const idWithConfirmations = { ...identityObject, confirmations, kyc };

        return JSON.stringify(idWithConfirmations).toString();
    }

    // params[0]: encryptedIdentity
    // params[1]: override
    public async createIdentity(ctx: Context) {
        console.info('============= START : Create identity ===========');

        const args = ctx.stub.getFunctionAndParameters();
        const params = args.params;
        this.validateParams(params, 2);

        const id = await this.getCreatorId(ctx);
        const encryptedIdentity = params[0];
        const override = params[1];

        if (override !== 'true') {
            const idExists = await this.exists(ctx, id);
            if (idExists) { throw new Error(`${id} already exists.`); }
        }

        const value = { encryptedIdentity };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(value)));
        console.info(`============= END : Create identity ${JSON.stringify(value)} ===========`);
    }

    private validateParams(params, count) {
        if (params.length !== count) { throw new Error(`Incorrect number of arguments. Expecting ${count}. Args: ${JSON.stringify(params)}`); }
    }

    private async getCreatorId(ctx: Context) {
        const rawId = await ctx.stub.invokeChaincode('helper', ['getCreatorId'], 'mychannel');
        if (rawId.status !== 200) { throw new Error(rawId.message); }
        return rawId.payload.toString();
    }

    private async getTimestamp(ctx: Context) {
        const rawTs = await ctx.stub.invokeChaincode('helper', ['getTimestamp'], 'mychannel');
        if (rawTs.status !== 200) { throw new Error(rawTs.message); }
        return rawTs.payload.toString();
    }

    private async exists(ctx: Context, key) {
        const existing = await ctx.stub.getState(key);
        return !existing.toString() ? false : true;
    }

    private async getIdentityById(ctx: Context, id) {
        const rawIdentity = await ctx.stub.getState(id);
        if (!rawIdentity || rawIdentity.length === 0) { throw new Error(`${id} does not exist`); }

        const identity = rawIdentity.toString();
        console.log('==== identity: ====', JSON.stringify(identity));
        return identity;
    }
}
