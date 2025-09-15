import { useState } from 'react';
import { Address, toNano } from '@ton/core';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useTonClient } from '../hooks/useTonClient';
import { Vesting } from '../contracts/Vesting';
import { Rocket, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export function DeploymentForm() {
  const { client } = useTonClient();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();

  const [formData, setFormData] = useState({
    claimerAddress: '',
    jettonBalance: '',
    jettonWalletAddress: '',
    cliffEndDate: '',
    cliffNumerator: '20',
    cliffDenominator: '100',
    vestingPeriod: '365',
    distributionFrequency: '30',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = () => {
    try {
      // Validate addresses
      Address.parse(formData.claimerAddress);
      Address.parse(formData.jettonWalletAddress);
      
      // Validate numbers
      const jettonBalance = parseFloat(formData.jettonBalance);
      const cliffNumerator = parseInt(formData.cliffNumerator);
      const cliffDenominator = parseInt(formData.cliffDenominator);
      const vestingPeriod = parseInt(formData.vestingPeriod);
      const distributionFrequency = parseInt(formData.distributionFrequency);
      
      if (jettonBalance <= 0) throw new Error('Jetton balance must be positive');
      if (cliffNumerator < 0 || cliffNumerator > cliffDenominator) throw new Error('Invalid cliff ratio');
      if (vestingPeriod <= 0) throw new Error('Vesting period must be positive');
      if (distributionFrequency <= 0) throw new Error('Distribution frequency must be positive');
      if (distributionFrequency > vestingPeriod) throw new Error('Distribution frequency cannot be longer than vesting period');
      
      // Validate cliff end date
      const cliffDate = new Date(formData.cliffEndDate);
      if (cliffDate <= new Date()) throw new Error('Cliff end date must be in the future');
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid form data');
      return false;
    }
  };

  const handleDeploy = async () => {
    if (!client || !userAddress) {
      setError('Please connect your wallet first');
      return;
    }
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setDeployedAddress(null);

    try {
      // Note: This is a demo implementation
      // In production, you would need the actual compiled contract code
      setError('Contract deployment is not available in demo mode. This would require the compiled contract bytecode.');
      return;
      
      /* Production deployment code would look like this:
      const adminAddress = Address.parse(userAddress);
      const claimerAddress = Address.parse(formData.claimerAddress);
      
      const vesting = client.open(
        Vesting.createFromConfig(
          {
            adminAddress,
            claimerAddress,
          },
          await getCompiledContractCode() // Would load actual compiled code
        )
      );

      const cliffEndDate = Math.floor(new Date(formData.cliffEndDate).getTime() / 1000);
      const jettonBalance = toNano(formData.jettonBalance);

      const deployData = {
        jettonBalance,
        jettonWalletAddress: Address.parse(formData.jettonWalletAddress),
        cliffEndDate,
        cliffNumerator: parseInt(formData.cliffNumerator),
        cliffDenominator: parseInt(formData.cliffDenominator),
        vestingPeriod: parseInt(formData.vestingPeriod) * 24 * 60 * 60, // Convert days to seconds
        distributionFrequency: parseInt(formData.distributionFrequency) * 24 * 60 * 60, // Convert days to seconds
      };

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: vesting.address.toString(),
            amount: toNano('1').toString(), // Deployment fee
            stateInit: vesting.init,
            payload: vesting.createDeployBody(deployData).toBoc().toString('base64'),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      setDeployedAddress(vesting.address.toString());
      */
      
    } catch (err) {
      console.error('Error deploying contract:', err);
      setError('Failed to deploy contract. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!userAddress) {
    return (
      <div className="card">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Wallet Required</h3>
          <p className="text-gray-600">
            Please connect your TON wallet to deploy a new vesting contract.
          </p>
        </div>
      </div>
    );
  }

  if (deployedAddress) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Contract Deployed Successfully!</h3>
          <p className="text-gray-600 mb-6">Your vesting contract has been deployed to:</p>
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <p className="font-mono text-sm break-all">{deployedAddress}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setDeployedAddress(null);
                setFormData({
                  claimerAddress: '',
                  jettonBalance: '',
                  jettonWalletAddress: '',
                  cliffEndDate: '',
                  cliffNumerator: '20',
                  cliffDenominator: '100',
                  vestingPeriod: '365',
                  distributionFrequency: '30',
                });
              }}
              className="btn-secondary"
            >
              Deploy Another
            </button>
            <a
              href={`https://tonviewer.com/${deployedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              View on Explorer
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Deploy Vesting Contract</h2>
        <p className="text-gray-600">
          Create a new vesting contract to distribute jettons over time with customizable parameters.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleDeploy(); }} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          
          <div>
            <label className="label">Claimer Address</label>
            <input
              type="text"
              placeholder="EQC..."
              value={formData.claimerAddress}
              onChange={(e) => handleInputChange('claimerAddress', e.target.value)}
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              The address that will be able to claim the vested tokens
            </p>
          </div>

          <div>
            <label className="label">Jetton Balance</label>
            <input
              type="number"
              step="0.000000001"
              placeholder="1000000"
              value={formData.jettonBalance}
              onChange={(e) => handleInputChange('jettonBalance', e.target.value)}
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Total amount of jettons to be vested (in decimal format)
            </p>
          </div>

          <div>
            <label className="label">Jetton Wallet Address</label>
            <input
              type="text"
              placeholder="EQC..."
              value={formData.jettonWalletAddress}
              onChange={(e) => handleInputChange('jettonWalletAddress', e.target.value)}
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              The jetton wallet address that holds the tokens to be vested
            </p>
          </div>
        </div>

        {/* Vesting Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Vesting Schedule</h3>
          
          <div>
            <label className="label">Cliff End Date</label>
            <input
              type="datetime-local"
              value={formData.cliffEndDate}
              onChange={(e) => handleInputChange('cliffEndDate', e.target.value)}
              className="input"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Date when the cliff period ends and tokens start becoming available
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Cliff Numerator</label>
              <input
                type="number"
                min="0"
                value={formData.cliffNumerator}
                onChange={(e) => handleInputChange('cliffNumerator', e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Cliff Denominator</label>
              <input
                type="number"
                min="1"
                value={formData.cliffDenominator}
                onChange={(e) => handleInputChange('cliffDenominator', e.target.value)}
                className="input"
                required
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Cliff unlock ratio: {formData.cliffNumerator}/{formData.cliffDenominator} = {
              formData.cliffDenominator !== '0' 
                ? ((parseInt(formData.cliffNumerator) / parseInt(formData.cliffDenominator)) * 100).toFixed(1)
                : '0'
            }% of total tokens unlocked at cliff end
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Vesting Period (days)</label>
              <input
                type="number"
                min="1"
                value={formData.vestingPeriod}
                onChange={(e) => handleInputChange('vestingPeriod', e.target.value)}
                className="input"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Total duration of the vesting period
              </p>
            </div>
            <div>
              <label className="label">Distribution Frequency (days)</label>
              <input
                type="number"
                min="1"
                value={formData.distributionFrequency}
                onChange={(e) => handleInputChange('distributionFrequency', e.target.value)}
                className="input"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                How often tokens are released after cliff
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Deploying Contract...
            </>
          ) : (
            <>
              <Rocket className="w-5 h-5 mr-2" />
              Deploy Vesting Contract
            </>
          )}
        </button>
      </form>
    </div>
  );
}