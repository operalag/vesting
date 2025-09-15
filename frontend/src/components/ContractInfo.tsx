import { useState, useEffect } from 'react';
import { Address } from '@ton/core';
import { useTonClient } from '../hooks/useTonClient';
import { Vesting } from '../contracts/Vesting';
import { formatTokenAmount, formatDate, formatAddress } from '../utils/formatters';
import { Loader2, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';

interface ContractInfoProps {
  contractAddress: string;
}

export function ContractInfo({ contractAddress }: ContractInfoProps) {
  const { client } = useTonClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractData, setContractData] = useState<any>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadContractData();
  }, [contractAddress, client]);

  const loadContractData = async () => {
    if (!client) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const address = Address.parse(contractAddress);
      const contract = client.open(Vesting.createFromAddress(address));
      
      // Check if contract exists and is initialized
      try {
        const lockupData = await contract.getLockupData();
        if (!lockupData.init) {
          setError('Contract is not initialized');
          return;
        }
        
        const vestingData = await contract.getVestingData();
        const claimableJettons = await contract.getClaimableJettons();
      }

      const lockupData = await contract.getLockupData();
      const claimableJettons = await contract.getClaimableJettons();
      const minFeeAmount = await contract.getMinFee();

        setContractData({
          lockupData,
          vestingData,
          claimableJettons,
        });
      } catch (contractError) {
        setError('Failed to read contract data. Contract may not be properly deployed.');
        return;
      }
    } catch (err) {
      console.error('Error loading contract data:', err);
      setError('Failed to load contract data. Please check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-ton-600" />
          <span className="ml-3 text-gray-600">Loading contract data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12 text-red-600">
          <AlertCircle className="w-8 h-8 mr-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!contractData) return null;

  const { lockupData, vestingData, claimableJettons } = contractData;
  const progressPercentage = lockupData.jettonBalance > 0 
    ? Number((lockupData.jettonsClaimed * 100n) / (lockupData.jettonsClaimed + lockupData.jettonBalance))
    : 100;

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Contract Overview</h2>
          <div className="flex items-center space-x-2">
            {lockupData.init ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Active</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">Not Initialized</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total Vested</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatTokenAmount(lockupData.jettonsClaimed + lockupData.jettonBalance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Already Claimed</p>
            <p className="text-2xl font-bold text-green-600">
              {formatTokenAmount(lockupData.jettonsClaimed)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Remaining</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatTokenAmount(lockupData.jettonBalance)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Claimable Now</p>
            <p className="text-2xl font-bold text-ton-600">
              {formatTokenAmount(claimableJettons)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Vesting Progress</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-ton-500 to-ton-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Addresses</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Admin</p>
              <p className="font-mono text-sm">{formatAddress(lockupData.adminAddress.toString())}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(lockupData.adminAddress.toString(), 'admin')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied === 'admin' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://tonviewer.com/${lockupData.adminAddress.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Claimer</p>
              <p className="font-mono text-sm">{formatAddress(lockupData.claimerAddress.toString())}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(lockupData.claimerAddress.toString(), 'claimer')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied === 'claimer' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://tonviewer.com/${lockupData.claimerAddress.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Jetton Wallet</p>
              <p className="font-mono text-sm">{formatAddress(vestingData.jettonWalletAddress.toString())}</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => copyToClipboard(vestingData.jettonWalletAddress.toString(), 'jetton')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {copied === 'jetton' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={`https://tonviewer.com/${vestingData.jettonWalletAddress.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Vesting Schedule */}
      <div className="card">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Vesting Schedule</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Cliff End Date</p>
              <p className="text-lg font-semibold">{formatDate(vestingData.cliffEndDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cliff Unlock Amount</p>
              <p className="text-lg font-semibold">{formatTokenAmount(vestingData.cliffUnlockAmount)}</p>
              <p className="text-xs text-gray-400">
                {vestingData.cliffNumerator}/{vestingData.cliffDenominator} of total
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Claimed</p>
              <p className="text-lg font-semibold">
                {lockupData.lastClaimed > 0 ? formatDate(lockupData.lastClaimed) : 'Never'}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Vesting Period</p>
              <p className="text-lg font-semibold">{Math.floor(vestingData.vestingPeriod / (24 * 60 * 60))} days</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Distribution Frequency</p>
              <p className="text-lg font-semibold">{Math.floor(vestingData.distributionFrequency / (24 * 60 * 60))} days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}