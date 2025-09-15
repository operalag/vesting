export function formatTokenAmount(amount: bigint, decimals: number = 9): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  return `${whole}.${trimmedRemainder}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export function formatAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

export function parseTokenAmount(amount: string, decimals: number = 9): bigint {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedDecimal);
}