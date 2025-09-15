import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type VestingConfig = {
    adminAddress: Address;
    claimerAddress: Address;
};

export type LockupData = {
    init: boolean;
    adminAddress: Address;
    claimerAddress: Address;
    jettonBalance: bigint;
    jettonsClaimed: bigint;
    lastClaimed: number;
};

export type VestingData = {
    jettonWalletAddress: Address;
    cliffEndDate: number;
    cliffNumerator: number;
    cliffDenominator: number;
    vestingPeriod: number;
    distributionFrequency: number;
};

export type ExtendedVestingData = VestingData & {
    cliffUnlockAmount: bigint;
};

export const VestingOpCodes = {
    claim: 0x3651a88c,
    sendServiceMessage: 0x000a3c66,
};

export function vestingConfigToCell(config: VestingConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.claimerAddress)
        .endCell();
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

    // Note: In a real implementation, you'd need to provide the compiled contract code
    static async getCode(): Promise<Cell> {
        // This would typically load the compiled contract code
        // For now, we'll throw an error to indicate this needs to be implemented
        // Return empty cell for now - in production this would load the actual compiled code
        return new Cell();
    }

    createClaimJettonsBody(opts: { queryId?: number }): Cell {
        return beginCell()
            .storeUint(VestingOpCodes.claim, 32)
            .storeUint(opts.queryId ?? 0, 64)
            .endCell();
    }

    createDeployBody(data: {
        jettonBalance: bigint;
        jettonWalletAddress: Address;
        cliffEndDate: number;
        cliffNumerator: number;
        cliffDenominator: number;
        vestingPeriod: number;
        distributionFrequency: number;
    }): Cell {
        return beginCell()
            .storeCoins(data.jettonBalance)
            .storeAddress(data.jettonWalletAddress)
            .storeUint(data.cliffEndDate, 32)
            .storeUint(data.cliffNumerator, 16)
            .storeUint(data.cliffDenominator, 16)
            .storeUint(data.vestingPeriod, 32)
            .storeUint(data.distributionFrequency, 32)
            .endCell();
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
            distributionFrequency,
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