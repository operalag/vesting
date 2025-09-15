import { useState, useEffect } from 'react';
import { TonClient } from '@ton/ton';

export function useTonClient() {
  const [client, setClient] = useState<TonClient | null>(null);

  useEffect(() => {
    // Initialize TON client with mainnet endpoint
    try {
      const tonClient = new TonClient({
        endpoint: 'https://toncenter.com/api/v2/jsonRPC',
        apiKey: undefined, // You might want to add an API key for production
      });

      setClient(tonClient);
    } catch (error) {
      console.error('Failed to initialize TON client:', error);
    }
  }, []);

  return { client };
}