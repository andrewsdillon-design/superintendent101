import { createConfig, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const connectors = [
  injected(),
  coinbaseWallet({ appName: 'ProFieldHub' }),
  // Only include WalletConnect if a projectId is configured
  ...(projectId ? [walletConnect({ projectId })] : []),
]

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

// USDC contract addresses on Base
export const USDC_ADDRESS = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
}

export const ACTIVE_CHAIN = process.env.NEXT_PUBLIC_USE_TESTNET === 'true' ? baseSepolia : base
export const USDC_CONTRACT = USDC_ADDRESS[ACTIVE_CHAIN.id]
export const TREASURY_ADDRESS = (process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '') as `0x${string}`
