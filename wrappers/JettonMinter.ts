import {
    Address,
    beginCell,
    Cell,
    Contract,
    ContractProvider,
} from '@ton/core';

export class JettonMinter implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonMinter(address);
    }

    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [{
            type: 'slice',
            cell: beginCell().storeAddress(owner).endCell()
        }])
        return res.stack.readAddress()
    }
}