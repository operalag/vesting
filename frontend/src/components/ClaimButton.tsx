import { useState, useEffect } from 'react';
import { Address } from '@ton/core';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useTonClient } from '../hooks/useTonClient';
import { Vesting } from '../contracts/Vesting';
import { formatTokenAmount } from '../utils/formatters';
import { Coins, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface ClaimButtonProps {
  contractAddress: string;
}

export function ClaimButton({ contractAddress }: ClaimButtonProps) {
  const { client } = useTonClient();
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  
  const [loading, setLoading] = useState(false);
  const [claimableAmount, setClaimableAmount] = useState<bigint>(0n);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [minFee, setMinFee] = useState<bigint>(0n);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkClaimStatus();
  }, [contractAddress, userAddress, client]);

  const checkClaimStatus = async () => {
    if (!client || !userAddress) {
      setIsAuthorized(false);
      return;
    }

    try {
      const address = Address.parse(contractAddress);
      const contract = client.open(Vesting.createFromAddress(address));
      
      const [lockupData, claimableJettons, minFeeAmount] = await Promise.all([
        contract.getLockupData(),
        contract.getClaimableJettons(),
        contract.getMinFee(),
      ]);

      const userAddr = Address.parse(userAddress);
      const isUserClaimer = lockupData.claimerAddress.equals(userAddr);
      
      setIsAuthorized(isUserClaimer);
      setClaimableAmount(claimableJettons);
      setMinFee(minFeeAmount);
    } catch (err) {
      console.error('Error checking claim status:', err);
      setError('Failed to check claim status');
    }
  };

  const handleClaim = async () => {
    if (!client || !userAddress || !isAuthorized || claimableAmount <= 0n) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const address = Address.parse(contractAddress);
      const contract = client.open(Vesting.createFromAddress(address));

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: contractAddress,
            amount: minFee.toString(),
            payload: contract.createClaimJettonsBody({
              queryId: Date.now(),
            }).toBoc().toString('base64'),
          },
        ],
      };

      await tonConnectUI.sendTransaction(transaction);
      setSuccess(true);
      
      // Refresh claim status after a delay
      setTimeout(() => {
        checkClaimStatus();
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error claiming jettons:', err);
      setError('Failed to claim jettons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!userAddress) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Wallet to Claim</h3>
          <p className="text-gray-600">
            Connect your TON wallet to check if you can claim tokens from this vesting contract.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Authorized</h3>
          <p className="text-gray-600">
            Your wallet address is not authorized to claim tokens from this vesting contract.
          </p>
        </div>
      </div>
    );
  }

  if (claimableAmount <= 0n) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tokens Available</h3>
          <p className="text-gray-600">
            There are currently no tokens available to claim. Check back later according to your vesting schedule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-center">
        <div className="p-4 bg-ton-100 rounded-full w-fit mx-auto mb-4">
          <Coins className="w-8 h-8 text-ton-600" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {formatTokenAmount(claimableAmount)} Tokens Available
        </h3>
        
        <p className="text-gray-600 mb-6">
          You can claim these tokens now. The transaction fee will be approximately {formatTokenAmount(minFee)} TON.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-600 text-sm">Transaction sent successfully!</p>
          </div>
        )}

        <button
          onClick={handleClaim}
          disabled={loading}
          className="btn-primary text-lg px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Claiming...
            </>
          ) : (
            <>
              <Coins className="w-5 h-5 mr-2" />
              Claim Tokens
            </>
          )}
        </button>
      </div>
    </div>
  );
}