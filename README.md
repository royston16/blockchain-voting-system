# Blockchain Voting System

A secure, transparent, and decentralized voting platform built on Ethereum blockchain technology.

## Overview

This application enables secure electronic voting using blockchain technology to ensure vote integrity, transparency, and immutability. The system combines traditional authentication methods (Firebase authentication with optional 2FA) with blockchain verification to create a trustworthy voting experience.

## Technology Interface

- Frontend: React with Vite
- Authentication: Firebase Authentication with Email/Password
- Blockchain: Ethereum with Solidity Smart Contracts
- Two-Factor Authentication: TOTP (Time-based One-Time Password)
- Wallet Integration: MetaMask

## Project Structure

blockchain-voting-system/
├── authentication/          # Authentication functionality
│   ├── firebase.js          # Firebase configuration and auth methods
│   └── twoFactor.js         # Two-factor authentication implementation
│
├── src/
│   ├── assets/                     # Static assets (images, icons)
│   ├── blockchain/                 # Blockchain integration
│   │   ├── build/                  # Compiled smart contracts
│   │   ├── contracts/              # Solidity contracts
│   │   │   └── VotingContract.sol  # Main voting contract
│   │   ├── ethereum-service.js     # Ethereum interaction service
│   │   └── zk-utils.js             # Zero-knowledge proof utilities
│   │
│   ├── chain/                      # Blockchain chain implementation
│   │   ├── Blockchain.js           # Blockchain data structure
│   │   ├── Context.js              # Blockchain context
│   │   └── Hash.js                 # Hashing utilities
│   │
│   ├── components/                  # React components
│   │   ├── Admin.jsx                # Admin interface
│   │   ├── AdminPanel.jsx           # Extended admin controls
│   │   ├── BlockchainInfo.jsx       # Blockchain status display
│   │   ├── BlockchainStructure.jsx  # Blockchain visualization
│   │   ├── BlockchainVerify.jsx     # Verification interface
│   │   ├── Login.jsx                # Login component
│   │   ├── Navbar.jsx               # Navigation bar
│   │   ├── Registration.jsx         # User registration
│   │   ├── Results.jsx              # Voting results display
│   │   ├── SetUp2FA.jsx             # 2FA setup interface
│   │   ├── TestingDashboard.jsx     # Contract testing interface
│   │   ├── VoteDashboard.jsx        # Voting interface
│   │   ├── VoteReceipt.jsx          # Vote receipt generator
│   │   └── VoteReceiptViewer.jsx    # Receipt viewing interface
│   │
│   ├── App.css                      # App styles
│   ├── App.jsx                      # Main application component
│   ├── index.css                    # Global styles
│   └── main.jsx                     # Entry point

## INSTALLATION ##

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- MetaMask browser extension

### Setup
1. Clone the repository
2. Install dependencies:
   ```
   npm install
   npm install crypto-js crypto-browserify otpauth qrcode ethers
   ```
3. Start the development server:
   ```
   npm run build
   npm run dev
   ```

## System Workflow

1. Setup: Administrator deploys the voting contract to the blockchain
2. Registration: Users register with email verification
3. Authentication: Users login with credentials (optionally with 2FA)
4. Voting: Authenticated users cast votes for their chosen candidate
5. Verification: Votes are recorded on the Ethereum blockchain with a downloadable receipt
6. Results: View real-time voting results and verify blockchain integrity

## Smart Contract Features

The voting contract (`VotingContract.sol`) provides:

- Voter verification: Ensures each voter can only vote once (multiple iff it is in development mode)
- Candidate validation: Validates candidate selection
- Batch processing: Supports batch voting for efficiency
- Vote storage: Securely stores votes with cryptographic hashing
- Results calculation: Tabulates and returns voting results
- Pagination: Supports retrieving votes in paginated format
- Election management: Configurable election parameters

## Authentication Features

The system uses a multi-layered authentication approach:

- Email/Password: Standard Firebase authentication
- Email Verification: Requires email confirmation
- Two-Factor Authentication: Optional TOTP-based 2FA
- Voter Keys: Generates unique voter identification
- Session Management: Tracks and validates user sessions

## USER GUIDES ##

### Administrator Guide

#### Contract Management
1. Navigate to the Testing Dashboard (accessible via the navbar after login)
2. Click "Deploy Contract" to deploy a new voting contract to the blockchain
   - This requires a connected MetaMask wallet with sufficient ETH for gas fees
3. Once deployed, the contract address will be stored and displayed
4. To reset the voting system and deploy a new contract:
   - Click "Clear Contract" to remove the existing contract reference
   - Then click "Deploy Contract" again to create a new one

#### Monitoring Results
1. Navigate to the Results page
2. View real-time voting results displayed as charts and numbers
3. Check the blockchain status and verification details
4. Use the blockchain verification page to validate the integrity of all votes

### VOTER GUIDE ###

#### Registration
1. Navigate to the Registration page
2. Enter your email address and password
3. Complete the email verification process
4. Set up Two-Factor Authentication (optional but recommended)

#### Voting Process
1. Log in with your credentials
2. Navigate to the Voting Dashboard
3. Select your preferred candidate
4. Click "Cast Vote"
5. Confirm the transaction in your MetaMask wallet
6. Wait for transaction confirmation
7. Save or print your vote receipt as proof of your vote

#### Viewing Your Vote Receipt
1. Navigate to the "Vote Receipts" page
2. Your vote receipt will contain:
   - Blockchain Voting Receipt
   - Vote Information
   - Voter Verification
   - Blockchain Details
   - Receipt Verification

#### Verifying the Blockchain
1. Navigate to the Blockchain Verification page
2. View the current blockchain status
3. Verify the integrity of all recorded votes
4. Check if your vote is properly included in the chain

## Wallet Connection

The system requires a connected Ethereum wallet (like MetaMask) to interact with the blockchain:

1. Install the MetaMask browser extension
2. Click "Select A Network" button on the top left of the extension
3. Click "Add a custom network" option
4. Integrate the preferred address from Ganache (local Ethereum blockchain) with the necessary configurations
5. Create or import a wallet using the "Private Key" of the preferred address from Ganache
6. When prompted by the application, approve connection requests

## Troubleshooting

### Contract Issues
- No Contract Deployed: Click "Deploy Contract" on the Testing Dashboard
- Contract Reset: Use "Clear Contract" to remove the existing contract reference and deploy a new one
- Transaction Failures: Ensure your wallet has sufficient ETH for gas fees

### Authentication Issues
- Email Verification: Check spam/junk folders for verification email
- 2FA Problems: Contact the administrator
- Login Failures: Contact admin for further support

### Voting Issues
- Unable to Vote: Ensure you are connected to the correct network in MetaMask
- Transaction Rejected: Check that you approved the transaction in your wallet
- Missing Receipt: Votes are stored locally; clearing browser data may remove receipts

## Security Features

### Data Privacy
- User emails are hashed before being stored on the blockchain
- Votes are linked to anonymized voter IDs, not directly to user accounts
- Vote receipts are stored locally in your browser
- The blockchain records only the necessary voting data, not personal information

### Blockchain Technology
The application uses the Ethereum blockchain with a smart contract to record votes. Each vote is a transaction on the blockchain, ensuring:

- Immutability: Once recorded, votes cannot be altered
- Transparency: All votes are publicly verifiable
- Security: Cryptographic techniques protect the integrity of the voting process

### Local Storage
For performance and cost reasons, vote details are also stored in your browser's localStorage:
- These records are used for displaying results and receipts
- The blockchain serves as the definitive record of all votes
- Clearing browser data will remove local vote information, but not blockchain records 