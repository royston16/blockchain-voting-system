# Blockchain Voting System 

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Packages to install into the terminal:
- run "npm install crypto-js"
- run "npm install crypto-browserify"
- run "npm install othpauth qrcode"
- run "npm install ethers"

# Start the development server with:
- npm run build
- npm run dev

# System Workflow
- Setup: Administrator deploys the voting contract to the blockchain
- Registration: Users register with email verification
- Authentication: Users login with credentials (optionally with 2FA)
- Voting: Authenticated users cast votes for their chosen candidate
- Verification: Votes are recorded on the ethereum-based blockchain with a receipt (downloadable)
- Results: View real-time voting results and verify blockchain integrity

### Administrator Guide ###

### Contract Management

1. Navigate to the Testing Dashboard (accessible via the navbar after login)
2. Click "Deploy Contract" to deploy a new voting contract to the blockchain
   - This requires a connected MetaMask wallet with sufficient ETH for gas fees
3. Once deployed, the contract address will be stored and displayed
4. To reset the voting system and deploy a new contract:
   - Click "Clear Contract" to remove the existing contract reference
   - Then click "Deploy Contract" again to create a new one

### Monitoring Results ###

1. Navigate to the Results page
2. View real-time voting results displayed as charts and numbers
3. Check the blockchain status and verification details
4. Use the blockchain verification page to validate the integrity of all votes

### Voter Guide ###

### Registration

1. Navigate to the Registration page
2. Enter your email address and password
3. Complete the email verification process
4. Set up Two-Factor Authentication (optional but recommended)

### Voting Process

1. Log in with your credentials
2. Navigate to the Voting Dashboard
3. Select your preferred candidate
4. Click "Cast Vote"
5. Confirm the transaction in your MetaMask wallet
6. Wait for transaction confirmation
7. Save or print your vote receipt as proof of your vote

### Viewing Your Vote Receipt

1. Navigate to the "Vote Receipts" page
2. Your vote receipt will contain:
   - Blockchain Voting Receipt
   - Vote Information
   - Voter Verification
   - Blockchain Details
   - Receipt Verification

### Verifying the Blockchain

1. Navigate to the Blockchain Verification page
2. View the current blockchain status
3. Verify the integrity of all recorded votes
4. Check if your vote is properly included in the chain

## Wallet Connection

The system requires a connected Ethereum wallet (like MetaMask) to interact with the blockchain:

1. Install the MetaMask browser extension
2. Click "Select A Network" button on the top left of the extension
3. Click "Add a custom network" option
4. Integrate the preferred address from Ganache (local ethereum blockchain) with other necessary configurations.
5. Create or import a wallet using the "Private Key" of the preferred address from Ganache
6. When prompted by the application, approve connection requests

## Troubleshooting

### Contract Issues
- **No Contract Deployed**: Click "Deploy Contract" on the Testing Dashboard
- **Contract Reset**: Use "Clear Contract" to remove the existing contract reference and deploy a new one
- **Transaction Failures**: Ensure your wallet has sufficient ETH for gas fees

### Authentication Issues
- **Email Verification**: Check spam/junk folders for verification email
- **2FA Problems**: Use the 2FA recovery codes or contact the administrator
- **Login Failures**: Contact admin for further support.

### Voting Issues

- **Unable to Vote**: Ensure you are connected to the correct network in MetaMask
- **Transaction Rejected**: Check that you approved the transaction in your wallet
- **Missing Receipt**: Votes are stored locally; clearing browser data may remove receipts

## Data Privacy

- User emails are hashed before being stored on the blockchain
- Votes are linked to anonymized voter IDs, not directly to user accounts
- Vote receipts are stored locally in your browser
- The blockchain records only the necessary voting data, not personal information


## Technical Details

### Blockchain Technology

The application uses the Ethereum blockchain with a simple smart contract to record votes. Each vote is a transaction on the blockchain, ensuring:

- **Immutability**: Once recorded, votes cannot be altered
- **Transparency**: All votes are publicly verifiable
- **Security**: Cryptographic techniques protect the integrity of the voting process

### Local Storage

For performance and cost reasons, vote details are also stored in your browser's localStorage:

- These records are used for displaying results and receipts
- The blockchain serves as the definitive record of all votes
- Clearing browser data will remove local vote information, but not blockchain records

### Contract Implementation

The system uses a minimal smart contract with these key functions:

- `setValue(uint256)`: Records a vote by incrementing the counter
- `getValue()`: Returns the current vote count
- Votes are stored with transaction details including hash, timestamp, and block number 