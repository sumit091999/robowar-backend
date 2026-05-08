# Robowar Backend

Express backend for decentralized Robowars user indexing on 0G.

The backend stores each authenticated user record as JSON on 0G Storage, writes the user's
wallet address and 0G data root to a 0G Chain smart contract for verifiable indexing, and saves
a database copy in MongoDB for app/admin lookup.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env`:

```env
PORT=4000
CLIENT_ORIGINS=http://localhost:5173,https://robowarsgame.xyz,https://www.robowarsgame.xyz
MONGODB_URI=your_mongodb_connection_string
MONGODB_COLLECTION=RoboWar
ZERO_G_CHAIN_RPC_URL=https://evmrpc.0g.ai
ZERO_G_CHAIN_ID=16661
ZERO_G_STORAGE_INDEXER_RPC=https://indexer-storage-turbo.0g.ai
ZERO_G_EXPLORER_URL=https://chainscan.0g.ai
ZERO_G_PRIVATE_KEY=your_backend_indexer_private_key
ROBOWAR_INDEX_CONTRACT_FILE=contract/RoboWarUserIndex.sol
ROBOWAR_INDEX_CONTRACT_ADDRESS=your_deployed_robo_war_user_index_contract
ROBOWAR_INDEX_START_BLOCK=0
```

3. Deploy `contract/RoboWarUserIndex.sol` to 0G Mainnet.

4. Put the deployed address in `ROBOWAR_INDEX_CONTRACT_ADDRESS`.

5. Start the backend:

```bash
npm run dev
```

For DigitalOcean App Platform, leave `PORT` unset or set it to the platform HTTP port
(`8080` by default). The app reads `process.env.PORT`, so it will use DigitalOcean's injected
port in production and `4000` only as a local fallback.

The frontend sends authenticated Privy users to:

```txt
POST /api/users/auth
```

Saved fields:

- `privyUserId`
- `walletAddress`
- `loginType`: `google`, `email`, or `connect_wallet`
- `type`: MongoDB-friendly login type, saved as `google`, `email`, or `wallet`
- `emailHash`
- `linkedAccounts`
- `loginCount`
- `firstLoginAt`
- `lastLoginAt`
- `createdAt`

MongoDB keeps one profile document per known identity match (email hash, Privy user id, or wallet
address). Repeat logins update the latest 0G transaction fields, increment `loginCount`, and refresh
`lastLoginAt`; full login history is read from 0G Chain events.

The API response includes:

- `storageRoot`: 0G Storage data root
- `storageTransactionHash`: 0G Storage transaction hash, when returned by the SDK
- `databaseId`: MongoDB document id
- `databaseCollection`: MongoDB collection name
- `databaseLoginCount`: total MongoDB login count for the matched identity
- `databaseLastLoginAt`: latest MongoDB login time for the matched identity
- `indexTransactionHash`: 0G Chain transaction hash
- `indexBlockNumber`: 0G Chain block number
