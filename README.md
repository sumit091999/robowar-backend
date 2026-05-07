# Robowar Backend

Express + MongoDB backend for storing authenticated Robowars users.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add your MongoDB connection string in `.env`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/robowar
MONGODB_COLLECTION=RoboWar
```

3. Start the backend:

```bash
npm run dev
```

The frontend sends authenticated Privy users to:

```txt
POST /api/users/auth
```

Saved fields:

- `privyUserId`
- `walletAddress`
- `loginType`: `google`, `email`, or `connect_wallet`
- `email`
- `linkedAccounts`
- `lastLoginAt`
