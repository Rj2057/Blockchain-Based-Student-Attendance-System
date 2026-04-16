window.APP_CONFIG = {
  // Replace with deployed contract address from deploy script output.
  contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  // Optional: used only when MetaMask SDK fallback is needed.
  infuraApiKey: "",
  contractAbi: [
    {
      "inputs": [
        { "internalType": "string", "name": "srn", "type": "string" },
        { "internalType": "string", "name": "name", "type": "string" }
      ],
      "name": "registerStudent",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "string", "name": "courseCode", "type": "string" },
        { "internalType": "uint256", "name": "startTimestamp", "type": "uint256" },
        { "internalType": "uint256", "name": "endTimestamp", "type": "uint256" }
      ],
      "name": "createSession",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
        { "internalType": "string", "name": "srn", "type": "string" },
        { "internalType": "bool", "name": "present", "type": "bool" }
      ],
      "name": "markAttendance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "string", "name": "srn", "type": "string" }],
      "name": "getStudent",
      "outputs": [
        { "internalType": "string", "name": "", "type": "string" },
        { "internalType": "string", "name": "", "type": "string" },
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "uint256", "name": "", "type": "uint256" },
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};
