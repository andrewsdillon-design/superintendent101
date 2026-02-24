export const MENTOR_ESCROW_ABI = [
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }, { name: 'mentor', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'fundSession',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'releasePayment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'refundClient',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    name: 'getSession',
    outputs: [{
      components: [
        { name: 'client', type: 'address' },
        { name: 'mentor', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'released', type: 'bool' },
        { name: 'refunded', type: 'bool' },
      ],
      name: '',
      type: 'tuple',
    }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'bookingId', type: 'string' }],
    name: 'encodeSessionId',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const
