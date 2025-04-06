import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type VestingConfig = {
    adminAddress: Address
    claimerAddress: Address
};

export type LockupData = {
    init: boolean
    adminAddress: Address
    claimerAddress: Address
    jettonBalance: bigint
    jettonsClaimed: bigint
    lastClaimed: number
};

export type VestingData = {
    jettonWalletAddress: Address
    cliffEndDate: number
    cliffNumerator: number
    cliffDenominator: number
    vestingPeriod: number
    distributionFrequency: number
};

export type ExtendedVestingData = VestingData & {
    cliffUnlockAmount: bigint
};

export type InitData = VestingData & {
    jettonBalance: bigint
};

export const VestingOpCodes = {
    claim: 0x3651a88c,
    sendServiceMessage: 0x000a3c66
};

export const VestingErrors = {
    notFromAdmin: 101,
    notFromClaimer: 102,
    notEnoughTon: 103,
    nothingToClaim: 104,
    invalidVestingPeriod: 105,
    lockupNotFinished: 106,
};

export function vestingConfigToCell(config: VestingConfig): Cell {
    return beginCell().storeAddress(config.adminAddress).storeAddress(config.claimerAddress).endCell();
}

export class Vesting implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Vesting(address);
    }

    static createFromConfig(config: VestingConfig, code: Cell, workchain = 0) {
        const data = vestingConfigToCell(config);
        const init = { code, data };
        return new Vesting(contractAddress(workchain, init), init);
    }

    async sendDeploy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        tokenBalance: bigint,
        vestingData: VestingData,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeCoins(tokenBalance)
                .storeAddress(vestingData.jettonWalletAddress)
                .storeUint(vestingData.cliffEndDate, 32)
                .storeUint(vestingData.cliffNumerator, 16)
                .storeUint(vestingData.cliffDenominator, 16)
                .storeUint(vestingData.vestingPeriod, 32)
                .storeUint(vestingData.distributionFrequency, 32)
            .endCell(),
        });
    }

    async sendClaimJettons(provider: ContractProvider, via: Sender, value: bigint, queryId?: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(VestingOpCodes.claim, 32)
                .storeUint(queryId ?? 0, 64)
            .endCell(),
        });
    }

    async sendServiceMessage(provider: ContractProvider, via: Sender, value: bigint, 
        opts: {
            queryId?: number,
            message: Cell,
            mode: number
        }
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(VestingOpCodes.sendServiceMessage, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeRef(opts.message)
                .storeUint(opts.mode, 8)
            .endCell(),
        });
    }

    async getLockupData(provider: ContractProvider): Promise<LockupData> {
        const result = await provider.get('get_lockup_data', []);

        const init = result.stack.readBoolean();
        const adminAddress = result.stack.readAddress();
        const claimerAddress = result.stack.readAddress();
        const jettonBalance = result.stack.readBigNumber();
        const jettonsClaimed = result.stack.readBigNumber();
        const lastClaimed = result.stack.readNumber();

        return {
            init,
            adminAddress,
            claimerAddress,
            jettonBalance,
            jettonsClaimed,
            lastClaimed,
        };
    }

    async getVestingData(provider: ContractProvider): Promise<ExtendedVestingData> {
        const result = await provider.get('get_vesting_data', []);

        const jettonWalletAddress = result.stack.readAddress();
        const cliffEndDate = result.stack.readNumber();
        const cliffNumerator = result.stack.readNumber();
        const cliffDenominator = result.stack.readNumber();
        const cliffUnlockAmount = result.stack.readBigNumber();
        const vestingPeriod = result.stack.readNumber();
        const distributionFrequency = result.stack.readNumber();

        return {
            jettonWalletAddress,
            cliffEndDate,
            cliffNumerator,
            cliffDenominator,
            cliffUnlockAmount,
            vestingPeriod,
            distributionFrequency
        };
    }

    async getClaimableJettons(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_claimable_jettons', []);
        return result.stack.readBigNumber();
    }

    async getMinFee(provider: ContractProvider): Promise<bigint> {
        const result = await provider.get('get_min_fee', []);
        return result.stack.readBigNumber();
    }
}