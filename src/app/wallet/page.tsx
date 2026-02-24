'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useAccount, useReadContract, useDisconnect, useBalance } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useEffect, useState } from 'react'
import { erc20Abi } from 'viem'
import { USDC_CONTRACT, ACTIVE_CHAIN, TREASURY_ADDRESS } from '@/lib/wagmi'
import MobileNav from '@/components/mobile-nav'

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function WalletPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const [saving, setSaving] = useState(false)
  const [savedAddress, setSavedAddress] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  // USDC balance on Base
  const { data: usdcBalance } = useReadContract({
    address: USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })

  // ETH balance for gas
  const { data: ethBalance } = useBalance({
    address,
    query: { enabled: !!address },
  })

  // Admin treasury USDC balance
  const { data: treasuryBalance } = useReadContract({
    address: USDC_CONTRACT,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: TREASURY_ADDRESS ? [TREASURY_ADDRESS] : undefined,
    query: { enabled: !!TREASURY_ADDRESS && user?.role === 'ADMIN' },
  })

  const usdcFormatted = usdcBalance !== undefined ? (Number(usdcBalance) / 1e6).toFixed(2) : '—'
  const ethFormatted = ethBalance ? parseFloat(ethBalance.formatted).toFixed(6) : '—'
  const treasuryFormatted = treasuryBalance !== undefined ? (Number(treasuryBalance) / 1e6).toFixed(2) : '—'

  const wrongNetwork = isConnected && chain?.id !== ACTIVE_CHAIN.id

  async function saveWallet() {
    if (!address) return
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      })
      if (res.ok) {
        setSavedAddress(address)
        setMessage('Wallet linked to your account.')
      } else {
        setMessage('Failed to save wallet.')
      }
    } catch {
      setMessage('Network error.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/wallet" className="text-white font-semibold">Wallet</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400 hover:text-white">Profile</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="font-display text-2xl font-bold text-neon-cyan mb-2">USDC WALLET</h1>
        <p className="text-gray-400 text-sm mb-8">Base Network · Powered by USDC</p>

        {/* Connect wallet card */}
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-bold text-safety-blue">CONNECT WALLET</h2>
            {isConnected && (
              <span className="text-xs text-safety-green border border-safety-green px-2 py-0.5">
                CONNECTED
              </span>
            )}
          </div>

          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openChainModal, mounted }) => {
              if (!mounted) return null
              if (!account) {
                return (
                  <div>
                    <p className="text-sm text-gray-300 mb-4">
                      Connect your wallet to send USDC for mentor sessions, track earnings, and participate in escrow.
                    </p>
                    <button onClick={openConnectModal} className="btn-primary text-sm">
                      Connect Wallet
                    </button>
                    <p className="text-xs text-gray-500 mt-3">
                      Supports MetaMask, Coinbase Wallet, WalletConnect, and more.
                    </p>
                  </div>
                )
              }
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">ADDRESS</p>
                      <p className="font-mono text-neon-cyan">{shortAddr(account.address)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">NETWORK</p>
                      {wrongNetwork ? (
                        <button onClick={openChainModal} className="text-safety-orange text-xs underline">
                          Switch to {ACTIVE_CHAIN.name}
                        </button>
                      ) : (
                        <p className="text-safety-green text-xs">{chain?.name ?? ACTIVE_CHAIN.name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="btn-secondary text-xs"
                  >
                    Disconnect
                  </button>
                </div>
              )
            }}
          </ConnectButton.Custom>
        </div>

        {/* Balances */}
        {isConnected && !wrongNetwork && (
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">USDC BALANCE</p>
              <p className="text-3xl font-bold text-safety-green">${usdcFormatted}</p>
              <p className="text-xs text-gray-500 mt-1">USDC on {ACTIVE_CHAIN.name}</p>
            </div>
            <div className="card">
              <p className="text-xs text-gray-400 mb-1">ETH FOR GAS</p>
              <p className="text-3xl font-bold text-neon-cyan">{ethFormatted}</p>
              <p className="text-xs text-gray-500 mt-1">ETH on {ACTIVE_CHAIN.name}</p>
              {ethBalance && parseFloat(ethBalance.formatted) < 0.001 && (
                <p className="text-xs text-safety-orange mt-2">⚠ Low ETH — needed for transaction fees</p>
              )}
            </div>
          </div>
        )}

        {/* Link wallet to account */}
        {isConnected && address && address !== savedAddress && (
          <div className="card mb-6 border border-safety-yellow/30">
            <h3 className="font-bold text-safety-yellow mb-2 text-sm">LINK TO YOUR ACCOUNT</h3>
            <p className="text-xs text-gray-400 mb-3">
              Save this wallet address to your ProFieldHub account so mentors and clients can pay you directly.
            </p>
            {message && (
              <p className={`text-xs mb-3 ${message.includes('Failed') ? 'text-safety-orange' : 'text-safety-green'}`}>{message}</p>
            )}
            <button onClick={saveWallet} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Link Wallet to Account'}
            </button>
          </div>
        )}
        {message && address === savedAddress && (
          <div className="card mb-6 border border-safety-green/30">
            <p className="text-xs text-safety-green">{message}</p>
          </div>
        )}

        {/* Escrow info */}
        <div className="card mb-6">
          <h3 className="font-bold text-safety-blue mb-4">HOW ESCROW WORKS</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1 text-xs">1. CLIENT BOOKS</p>
              <p className="text-gray-400 text-xs">Client deposits USDC into the escrow smart contract on Base. Funds are locked until session is complete.</p>
            </div>
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1 text-xs">2. SESSION HAPPENS</p>
              <p className="text-gray-400 text-xs">Mentor delivers the session. Both parties confirm completion via the app.</p>
            </div>
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1 text-xs">3. FUNDS RELEASE</p>
              <p className="text-gray-400 text-xs">Smart contract sends 95% to mentor wallet, 5% platform fee to ProFieldHub treasury. Instant settlement.</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blueprint-paper/20 border border-blueprint-grid text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Contract: <span className="text-gray-500">MentorEscrow on Base</span></p>
            <p>Escrow contract address will be published here after deployment. All sessions settle peer-to-peer on-chain — no intermediary holds your funds.</p>
          </div>
        </div>

        {/* Admin: treasury balance */}
        {user?.role === 'ADMIN' && TREASURY_ADDRESS && (
          <div className="card border border-safety-orange/30">
            <h3 className="font-bold text-safety-orange mb-4">ADMIN — PLATFORM TREASURY</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">TREASURY ADDRESS</p>
                <p className="font-mono text-xs text-gray-300">{shortAddr(TREASURY_ADDRESS)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">TREASURY USDC BALANCE</p>
                <p className="text-2xl font-bold text-safety-orange">${treasuryFormatted}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">5% platform fee from all released escrow sessions accumulates here.</p>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
