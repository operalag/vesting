import { useState } from 'react';
import { Address } from '@ton/core';
import { Search, Clock, Users, Coins, Calendar } from 'lucide-react';
import { ContractInfo } from './ContractInfo';
import { ClaimButton } from './ClaimButton';

export function VestingViewer() {
  const [contractAddress, setContractAddress] = useState('');
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);

  const handleAddressChange = (value: string) => {
    setContractAddress(value);
    try {
      if (value.trim()) {
        Address.parse(value.trim());
        setIsValidAddress(true);
      } else {
        setIsValidAddress(false);
      }
    } catch {
      setIsValidAddress(false);
    }
  };

  const handleSearch = () => {
    if (isValidAddress) {
      setSearchedAddress(contractAddress.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="card">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          View Vesting Contract
        </h2>
        <p className="text-gray-600 mb-6">
          Enter a vesting contract address to view its details and claim available tokens.
        </p>
        
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter vesting contract address (EQC...)"
              value={contractAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyPress={handleKeyPress}
              className={`input ${
                contractAddress && !isValidAddress 
                  ? 'border-red-300 focus:ring-red-500' 
                  : ''
              }`}
            />
            {contractAddress && !isValidAddress && (
              <p className="text-red-500 text-sm mt-1">
                Please enter a valid TON address
              </p>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!isValidAddress}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* Contract Information */}
      {searchedAddress && (
        <>
          <ContractInfo contractAddress={searchedAddress} />
          <ClaimButton contractAddress={searchedAddress} />
        </>
      )}

      {/* Info Cards */}
      {!searchedAddress && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <div className="p-3 bg-ton-100 rounded-full w-fit mx-auto mb-3">
              <Clock className="w-6 h-6 text-ton-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Time-based Vesting</h3>
            <p className="text-sm text-gray-600">
              Tokens are released over time according to a predefined schedule
            </p>
          </div>
          
          <div className="card text-center">
            <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Cliff Period</h3>
            <p className="text-sm text-gray-600">
              Initial waiting period before any tokens can be claimed
            </p>
          </div>
          
          <div className="card text-center">
            <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-3">
              <Coins className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Secure Claims</h3>
            <p className="text-sm text-gray-600">
              Only authorized claimers can withdraw their vested tokens
            </p>
          </div>
          
          <div className="card text-center">
            <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Flexible Schedule</h3>
            <p className="text-sm text-gray-600">
              Customizable distribution frequency and vesting periods
            </p>
          </div>
        </div>
      )}
    </div>
  );
}