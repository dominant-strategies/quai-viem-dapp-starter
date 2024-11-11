import { useState, useEffect } from 'react'
import { 
  createWalletClient, 
  custom, 
  parseEther, 
  CustomTransport,
  type WalletClient, 
  isAddress,
} from 'viem'
import { quaiChain } from './formatter'

export function createQuaiTransport(provider: any): CustomTransport {

  const baseTransport = custom(provider)

  return custom({
    ...baseTransport,
    async request({ method, params }) {
      // Map eth_chainId to quai_chainId
      if (method === 'eth_chainId') {
        method = 'quai_chainId'
      }

      if (method === 'eth_sendTransaction') {
        method = 'quai_sendTransaction'
      }

      // Call the underlying transport with possibly modified method
      return provider.request({
        method,
        params,
      })
    }
  })
}

const PelagusWalletApp = () => {
  const [account, setAccount] = useState<`0x${string}`>('0x')
  const [client, setClient] = useState<WalletClient | null>(null)
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  // Initialize wallet client when component mounts
  useEffect(() => {
    if (typeof window.pelagus === 'undefined') {
      setError('Please install Pelagus wallet')
      return
    }

    const provider = window.pelagus

    // Initialize wallet client
    const walletClient = createWalletClient({
      account: undefined, // explicitly set as undefined initially
      chain: quaiChain,
      transport: createQuaiTransport(provider)
    })
    
    setClient(walletClient)

    // Listen for account changes
    provider.on('accountsChanged', handleAccountsChanged)
    provider.on('chainChanged', handleChainChanged)

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged)
      provider.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount('0x')
      setStatus('')
    } else if (accounts[0] !== account) {
      // Account changed
      setAccount(accounts[0] as `0x${string}`)
    }
  }

  const handleChainChanged = (_chainId: string) => {
    // Reload the page when chain changes
    window.location.reload()
  }

  const connectWallet = async () => {
    if (!client) return

    try {
      setStatus('Connecting...')
      setError('')
      
      const provider = window.pelagus
      
      // Request account access
      const accounts = await provider.request({ 
        method: 'quai_requestAccounts' 
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      setAccount(accounts[0] as `0x${string}`)
      setStatus('Connected')

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to connect wallet')
      }
      setStatus('')
    }
  }

  const validateAddress = (address: string): address is `0x${string}` => {
    return isAddress(address)
  }

  const sendTransaction = async () => {
    if (!amount || !recipient || !client || !account) {
      setError('Please enter amount and recipient')
      return
    }

    // Validate recipient address
    if (!validateAddress(recipient)) {
      setError('Invalid recipient address')
      return
    }

    try {
      setStatus('Sending transaction...')
      setError('')

      const hash = await client.sendTransaction({
        chainId: quaiChain.id,
        chain: quaiChain,
        account: account,
        to: recipient,
        value: parseEther(amount)
      })

      setStatus(`Transaction sent! Hash: ${hash}`)
      setAmount('')
      setRecipient('')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Transaction failed')
      }
      setStatus('')
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Pelagus Wallet Integration</h1>
        
        {account == "0x" ? (
          <button 
            onClick={connectWallet}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="p-4 bg-gray-100 rounded">
            <p className="text-gray-700">Connected Account:</p>
            <p className="font-mono break-all">{account}</p>
          </div>
        )}
      </div>

      {account != "0x" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (QUAI)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              min="0"
              step="any"
              className="w-full p-2 border rounded"
            />
          </div>

          <button
            onClick={sendTransaction}
            disabled={!amount || !recipient}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300"
          >
            Send Transaction
          </button>
        </div>
      )}

      {status && (
        <div className="p-4 bg-blue-100 text-blue-700 rounded">
          {status}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

export default PelagusWalletApp