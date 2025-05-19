import { beginCell, internal, SendMode, storeMessageRelaxed, toNano } from '@ton/core';
import { Vesting } from '../wrappers/Vesting';
import { NetworkProvider } from '@ton/blueprint';
import { promptAddress, promptAmount} from '../wrappers/ui-utils';
import { TonClient4 } from '@ton/ton';
import { JettonMinter } from '../wrappers/JettonMinter';

const actionList = ['Withdraw TON', 'Transfer Jetton']
const sendModes = ['Pay fees separately', 'Carry all remaining message value', 'Carry all remaining balance']

export async function run(provider: NetworkProvider) {
    const ui = provider.ui()
    const api = provider.api() as TonClient4
    const vestingAddress = await promptAddress("Enter the address of the vesting", ui)

    try {
        const seqno = (await api.getLastBlock()).last.seqno
        const contractState = (await api.getAccount(seqno, vestingAddress))
        if (contractState.account.state.type === 'uninit')
            throw("Contract is not deployed")

        const vesting = provider.open(Vesting.createFromAddress(vestingAddress))

        const adminAddress = (await vesting.getLockupData()).adminAddress

        if (!provider.sender().address!.equals(adminAddress)) {
            ui.write('You are not admin of this vesting')
            return
        }

        const action = await ui.choose('Pick action: ', actionList, (c) => c)
        switch (action) {
            case 'Withdraw TON':
                const toAddress = await promptAddress('Enter the address of the recipient', ui, provider.sender().address)
                let tonAmount = 0n
                let modeNumber = 0
                const mode = await ui.choose('Pick send mode: ', sendModes, (c) => c)
                switch (mode) {
                    case 'Pay fees separately':
                        tonAmount = toNano(await promptAmount('Enter the amount you want to withdraw: ', ui))
                        modeNumber = 1
                    case 'Carry all remaining message value':
                        modeNumber = 64
                    case 'Carry all remaining balance':
                        modeNumber = 128 
                }
                const withdrawMsg = internal({
                    to: toAddress,
                    bounce: false,
                    value: tonAmount,
                    body: beginCell().endCell()
                })
                await vesting.sendServiceMessage(provider.sender(), toNano('0.05'), {
                    message: beginCell().store(storeMessageRelaxed(withdrawMsg)).endCell(),
                    mode: modeNumber
                })
            case 'Transfer Jetton':
                const jettonAddress = await promptAddress('Enter the address of the jetton', ui)
                const jetton = provider.open(JettonMinter.createFromAddress(jettonAddress))

                if ((await api.getAccount(seqno, jetton.address)).account.state.type !== 'active')
                    ui.write('Jetton contract is not active')

                const jettonWalletAddress = await jetton.getWalletAddress(vesting.address)

                const jettonRecepientAddress = await promptAddress('Enter the address of the recipient', ui, provider.sender().address)
                const jettonAmount = await promptAmount('Enter the jetton amount in decimal form:', ui);

                const transferBody = beginCell()
                    .storeUint(0xf8a7ea5, 32)
                    .storeUint(0, 64)
                    .storeCoins(toNano(jettonAmount))
                    .storeAddress(jettonRecepientAddress)
                    .storeAddress(provider.sender().address)
                    .storeBit(false)
                    .storeCoins(1n)
                    .storeBit(false)
                .endCell()

                const transferMsg = internal({
                    to: jettonWalletAddress,
                    bounce: false,
                    value: toNano('0.05'),
                    body: transferBody
                })
                await vesting.sendServiceMessage(provider.sender(), toNano('0.05'), {
                    message: beginCell().store(storeMessageRelaxed(transferMsg)).endCell(),
                    mode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS
                })
        }
        ui.write('Transaction Sent')

    } catch (e: any) {
        ui.write(e.message)
        return
    }
}