import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Header } from './components/Header';
import { VestingViewer } from './components/VestingViewer';
import { DeploymentForm } from './components/DeploymentForm';
import { useState } from 'react';

const manifestUrl = 'https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json';

function App() {
  const [activeTab, setActiveTab] = useState<'viewer' | 'deploy'>('viewer');

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <div className="min-h-screen bg-gradient-to-br from-ton-50 to-blue-50">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                TON Vesting Manager
              </h1>
              <p className="text-lg text-gray-600">
                Manage and interact with TON jetton vesting contracts
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab('viewer')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'viewer'
                    ? 'bg-white text-ton-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                View Contract
              </button>
              <button
                onClick={() => setActiveTab('deploy')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTab === 'deploy'
                    ? 'bg-white text-ton-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Deploy Contract
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'viewer' && <VestingViewer />}
            {activeTab === 'deploy' && <DeploymentForm />}
          </div>
        </main>
      </div>
    </TonConnectUIProvider>
  );
}

export default App;