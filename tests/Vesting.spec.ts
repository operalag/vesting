import { Blockchain, BlockchainSnapshot, createShardAccount, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, internal, SendMode, storeMessageRelaxed, storeStateInit, toNano } from '@ton/core';
import { ExtendedVestingData, Vesting, VestingData, VestingErrors } from '../wrappers/Vesting';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { randomAddress } from '@ton/test-utils';
import { jettonWalletCode, JettonWalletOpCodes } from '../wrappers/JettonWallet';

describe('Vesting', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Vesting');
    });

    let blockchain: Blockchain;
    let initialState: BlockchainSnapshot;
    let vesting: SandboxContract<Vesting>;
    let claimer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;

    const jettonMasterAddress = randomAddress();

    const creationNow = Math.floor(Date.now() / 1000);
    const jettonBalanceConfig = 200000n;
    let afterDeploy: BlockchainSnapshot;
    let vestingDataConfig: VestingData = {
        jettonWalletAddress: randomAddress(),
        cliffEndDate: creationNow + 6 * 30 * 24 * 60 * 60,
        cliffNumerator: 20,
        cliffDenominator: 100,
        vestingPeriod: 365 * 24 * 60 * 60,
        distributionFrequency: 30 * 24 * 60 * 60
    };
    let extendedVestingDataConfig: ExtendedVestingData;
    let vestingJettonWallet: Address;
    let claimerJettonWallet: Address;

    const userJettonWalletInit = (address: Address): Cell => {
        return beginCell()
            .store(
                storeStateInit({
                    code: Cell.fromBase64(jettonWalletCode),
                    data: beginCell()
                        .storeCoins(0)
                        .storeAddress(address)
                        .storeAddress(jettonMasterAddress)
                        .storeRef(Cell.fromBase64(jettonWalletCode))
                    .endCell(),
                }),
            )
        .endCell();
    };

    const userJettonWalletAddress = (address: Address): Address => {
        return new Address(0, userJettonWalletInit(address).hash());
    };

    beforeEach(() => {
        blockchain.now = creationNow
    })
    
    beforeAll(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        claimer = await blockchain.treasury('claimer');

        vesting = blockchain.openContract(
            Vesting.createFromConfig(
                {
                    adminAddress: admin.address,
                    claimerAddress: claimer.address,
                }, code
            )
        );

        vestingJettonWallet = userJettonWalletAddress(vesting.address);

        await blockchain.setShardAccount(
            vestingJettonWallet,
            createShardAccount({
                address: vestingJettonWallet,
                code: Cell.fromBase64(jettonWalletCode),
                data: beginCell()
                    .storeCoins(jettonBalanceConfig)
                    .storeAddress(vesting.address)
                    .storeAddress(jettonMasterAddress)
                    .storeRef(Cell.fromBase64(jettonWalletCode))
                .endCell(),
                balance: toNano('1'),
            }),
        );

        vestingDataConfig.jettonWalletAddress = vestingJettonWallet;

        extendedVestingDataConfig = {
            ...vestingDataConfig,
            cliffUnlockAmount:
                (jettonBalanceConfig * BigInt(vestingDataConfig.cliffNumerator)) /
                BigInt(vestingDataConfig.cliffDenominator)
        };

        const deployResult = await vesting.sendDeploy(
            admin.getSender(),
            toNano('1'),
            jettonBalanceConfig,
            vestingDataConfig,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: admin.address,
            to: vesting.address,
            deploy: true,
            success: true,
        });

        claimerJettonWallet = userJettonWalletAddress(claimer.address);  

        initialState = blockchain.snapshot();
    });

    afterEach(async () => {
        await blockchain.loadFrom(initialState)
    });

    it('should deploy', async () => {
        const lockupData = await vesting.getLockupData();
        expect(lockupData.init).toBeTruthy();
        expect(lockupData.adminAddress.toString()).toStrictEqual(admin.address.toString());
        expect(lockupData.claimerAddress.toString()).toStrictEqual(claimer.address.toString());
        expect(lockupData.jettonBalance).toStrictEqual(jettonBalanceConfig);
        expect(lockupData.jettonsClaimed).toStrictEqual(0n);
        expect(lockupData.lastClaimed).toStrictEqual(0);

        const vestingData = await vesting.getVestingData();
        expect(vestingData.jettonWalletAddress.toString()).toStrictEqual(
            extendedVestingDataConfig.jettonWalletAddress.toString(),
        );
        expect(vestingData.cliffEndDate).toStrictEqual(extendedVestingDataConfig.cliffEndDate);
        expect(vestingData.cliffNumerator).toStrictEqual(extendedVestingDataConfig.cliffNumerator);
        expect(vestingData.cliffDenominator).toStrictEqual(extendedVestingDataConfig.cliffDenominator);
        expect(vestingData.vestingPeriod).toStrictEqual(extendedVestingDataConfig.vestingPeriod);
        expect(vestingData.cliffUnlockAmount).toStrictEqual(extendedVestingDataConfig.cliffUnlockAmount);

        afterDeploy = blockchain.snapshot();
    });

    it('should accept claim only from claimer', async () => {
        blockchain.now! += 1
        const result = await vesting.sendClaimJettons(admin.getSender(), toNano('1'));
        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.notFromClaimer
        });
    });

    it('should not process claim if there is nothing to claim', async () => {
        blockchain.now! += 2
        const result = await vesting.sendClaimJettons(claimer.getSender(), toNano('1'));
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.nothingToClaim
        });
    });

    it('should not process claim if there is not enough funds', async () => {
        blockchain.now! += 3
        const minFee = await vesting.getMinFee();
        let result = await vesting.sendClaimJettons(claimer.getSender(), minFee - 1n);
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.notEnoughTon
        });

        result = await vesting.sendClaimJettons(claimer.getSender(), minFee);
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.nothingToClaim
        });
    });

    it('should claim entire jettons after 1 year', async () => {
        blockchain.now! += 365 * 24 * 60 * 60;
        const minFee = await vesting.getMinFee();
        const claimableJettons = await vesting.getClaimableJettons();

        const vestingBalanceBeforeClaim = (await vesting.getLockupData()).jettonBalance;

        expect(claimableJettons).toEqual(
            extendedVestingDataConfig.cliffUnlockAmount + ((vestingBalanceBeforeClaim - extendedVestingDataConfig.cliffUnlockAmount) / 12n) * 6n
        );

        const result = await vesting.sendClaimJettons(claimer.getSender(), minFee);

        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: vesting.address,
            to: vestingJettonWallet,
            success: true
        });

        expect(result.transactions).toHaveTransaction({
            from: vestingJettonWallet,
            to: claimerJettonWallet,
            success: true
        });

        const updatedLockupData = await vesting.getLockupData();
        expect(updatedLockupData.jettonBalance).toStrictEqual(vestingBalanceBeforeClaim - claimableJettons);
    });

    it('should unlock cliff jettons after cliff period', async () => {
        blockchain.now! += 6 * 30 * 24 * 60 * 60 - 1;
    
        let result = await vesting.sendClaimJettons(claimer.getSender(), toNano('1'));
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.nothingToClaim
        });
    
        blockchain.now! += 1;
    
        const vestingBalanceBeforeClaim = (await vesting.getLockupData()).jettonBalance;
        const claimableJettons = await vesting.getClaimableJettons();
        expect(claimableJettons).toStrictEqual(extendedVestingDataConfig.cliffUnlockAmount);
    
        result = await vesting.sendClaimJettons(claimer.getSender(), toNano('1'));
    
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: true,
        });
    
        expect(result.transactions).toHaveTransaction({
            from: vesting.address,
            to: vestingJettonWallet,
            success: true,
        });
    
        expect(result.transactions).toHaveTransaction({
            from: vestingJettonWallet,
            to: claimerJettonWallet,
            success: true
        });
    
        expect(result.transactions).toHaveTransaction({
            from: claimerJettonWallet,
            to: claimer.address,
            success: false,
            value: 1n
        });
    
        const lockupData = await vesting.getLockupData();
    
        expect(lockupData.jettonsClaimed).toStrictEqual(claimableJettons);
        expect(lockupData.lastClaimed).toStrictEqual(blockchain.now);
        expect(lockupData.jettonBalance).toStrictEqual(
            vestingBalanceBeforeClaim - claimableJettons
        );
    });  
    
    it('should accept service message only from admin', async () => {
        blockchain.now! += 1
        const result = await vesting.sendServiceMessage(claimer.getSender(), toNano('0.05'), {
            message: new Cell(),
            mode: SendMode.CARRY_ALL_REMAINING_INCOMING_VALUE
        });
        expect(result.transactions).toHaveTransaction({
            from: claimer.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.notFromAdmin
        });
    })

    it('should not process service message if lockup period not finished', async () => {
        blockchain.now! += 1
        const result = await vesting.sendServiceMessage(admin.getSender(), toNano('0.05'), {
            message: new Cell(),
            mode: SendMode.CARRY_ALL_REMAINING_INCOMING_VALUE
        });
        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: vesting.address,
            success: false,
            exitCode: VestingErrors.lockupNotFinished
        });
    })

    it('should service message', async () => {
        blockchain.now! += 19 * 30 * 24 * 60 * 60;
        const minFee = await vesting.getMinFee();

        await vesting.sendClaimJettons(claimer.getSender(), minFee);

        expect((await vesting.getLockupData()).jettonBalance).toEqual(0n)

        const msg = internal({
            to: admin.address,
            value: toNano('0'),
            body: beginCell()
                .storeUint(JettonWalletOpCodes.excesses, 32)
            .endCell(),
        });

        const result = await vesting.sendServiceMessage(admin.getSender(), toNano('0.05'), {
            message: beginCell().store(storeMessageRelaxed(msg)).endCell(),
            mode: SendMode.CARRY_ALL_REMAINING_BALANCE + SendMode.DESTROY_ACCOUNT_IF_ZERO
        });

        expect(result.transactions).toHaveTransaction({
            from: admin.address,
            to: vesting.address,
            success: true,
        });

        expect(result.transactions).toHaveTransaction({
            from: vesting.address,
            to: admin.address,
            op: JettonWalletOpCodes.excesses,
            success: true
        })

        expect((await blockchain.getContract(vesting.address)).balance).toEqual(0n)
        expect((await blockchain.getContract(vesting.address)).accountState?.type === 'frozen')
    })
});