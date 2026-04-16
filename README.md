# Blockchain-Based Student Attendance System

A decentralized attendance tracking project using Solidity smart contracts and a web frontend.

## Features

- Decentralized attendance ledger on blockchain.
- Instructor-based authorization for secure writes.
- Manual SRN entry plus QR scan support for attendance.
- Smart contract events and immutable attendance logs.
- Attendance report with percentage calculation.
- Responsive frontend dashboard with modern UI.

## Tech Stack

- Solidity `0.8.24`
- Hardhat
- Ethers.js (frontend integration)
- HTML/CSS/JavaScript frontend
- Browser-based QR generation/scanning

## Project Structure

```text
contracts/StudentAttendance.sol    # Smart contract
scripts/deploy.js                  # Deployment script
test/StudentAttendance.test.js     # Contract tests
frontend/index.html                # UI page
frontend/styles.css                # UI styling
frontend/app.js                    # Frontend logic
frontend/config.js                 # Contract address + ABI config
```

## Contract Design

- `registerStudent(srn, name)`:
  - Stores student identity mapped by SRN hash.
- `createSession(courseCode, startTimestamp, endTimestamp)`:
  - Opens a new attendance session with a start-end time window.
- `markAttendance(sessionId, srn, present)`:
  - Records present/absent for one SRN once per session.
- `getStudent(srn)`:
  - Returns SRN, name, present count, total marked, and attendance percentage scaled by 100.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Compile contract:

```bash
npm run compile
```

3. Run local blockchain:

```bash
npm run node
```

4. Deploy contract in another terminal:

```bash
npm run deploy:local
```

5. Update `frontend/config.js` with deployed contract address.

6. In the UI, create sessions using:
   - Session date
   - Predefined class slot between `08:00` and `17:00`
7. Register students in the UI. A QR code will be generated from the SRN.

8. Start a static server from project root (example):

```bash
python3 -m http.server 5500
```

9. Open browser:

- `http://localhost:5500/frontend/`

10. For attendance:
  - either type the SRN manually,
  - or use the QR scanner to fill the SRN field automatically.

## Sepolia Deployment (Optional)

1. Create `.env` from `.env.example` and add RPC URL + private key.
2. Run:

```bash
npm run deploy:sepolia
```

3. Put the Sepolia deployed contract address into `frontend/config.js`.

Note:
- `SEPOLIA_RPC_URL` and `PRIVATE_KEY` are used by Hardhat scripts for deployment.
- Frontend transactions are signed by MetaMask account, not by the `.env` private key.
- QR codes are for student SRNs only; the blockchain contract still stores attendance.

## End-to-End Deployment Checklist

### 1) One-Time Setup

1. Install Node.js 20+ (recommended for Hardhat compatibility).
2. Clone/open this project.
3. Run:

```bash
npm install
```

### 2) Local Deployment (Best for Demo/Development)

1. Start local chain:

```bash
npm run node
```

2. In a new terminal, deploy contract:

```bash
npm run deploy:local
```

3. Copy deployed address and paste into `frontend/config.js` as `contractAddress`.
4. Start frontend server:

```bash
python3 -m http.server 5500
```

5. Open `http://localhost:5500/frontend/`.
6. In MetaMask, add/switch to Localhost network:
  - RPC URL: `http://127.0.0.1:8545`
  - Chain ID: `31337`
  - Currency symbol: `ETH`
7. Import one Hardhat test account private key into MetaMask (local only).
8. Connect wallet in app and use forms.

### 3) Sepolia Deployment (Infura + MetaMask)

1. Create `.env` in project root:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY_WITHOUT_0x
```

2. Deploy:

```bash
npm run deploy:sepolia
```

3. Copy deployed Sepolia contract address into `frontend/config.js`.
4. In MetaMask, switch network to Sepolia.
5. Ensure wallet has Sepolia ETH for gas.
6. Start frontend server and use app.

### 4) What You Need To Add (Top to Bottom)

1. `SEPOLIA_RPC_URL` in `.env` for deployment through Infura.
2. `PRIVATE_KEY` in `.env` for deployment signer.
3. Deployed contract address in `frontend/config.js`.
4. Correct network in MetaMask (Localhost or Sepolia).
5. Test ETH in selected network for transaction gas.

### 5) Important Security Notes

1. Never commit `.env` to Git.
2. Never share your real private key.
3. Use a dedicated low-value wallet for testnet deployment.

## QR/RFID Extension Path

This version supports manual SRN entry as requested. To support QR/RFID later:

- Use scanner hardware/software to decode student identifier.
- Pass scanned SRN directly to `markAttendance(sessionId, srn, present)`.
- Optionally add backend middleware for scanner authentication.
