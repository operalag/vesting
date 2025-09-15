import { TonConnectButton } from '@tonconnect/ui-react';
import { Coins } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-ton-100 rounded-lg">
              <Coins className="w-6 h-6 text-ton-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TON Vesting</h1>
              <p className="text-sm text-gray-500">Smart Contract Manager</p>
            </div>
          </div>
          
          <TonConnectButton />
        </div>
      </div>
    </header>
  );
}