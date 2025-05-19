import { Vesting } from '../wrappers/Vesting';
import { NetworkProvider } from '@ton/blueprint';
import { promptAddress } from '../wrappers/ui-utils';
import { TonClient4 } from '@ton/ton';

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

        const claimerAddress = (await vesting.getLockupData()).claimerAddress

        if (!provider.sender().address!.equals(claimerAddress)) {
            ui.write('You are not claimer of this vesting')
            return
        }

        const claimableJettons = await vesting.getClaimableJettons()

        if (!claimableJettons) {
            ui.write('Nothing to claim')
            return
        }

        const minFee = await vesting.getMinFee()

        await vesting.sendClaimJettons(provider.sender(), minFee)
        ui.write("Transaction Sent")

    } catch (e: any) {
        ui.write(e.message)
        return
    }
}