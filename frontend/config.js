window.APP_CONFIG = {
  // Replace with deployed contract address from deploy script output.
  contractAddress: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  // Local Hardhat chain id. Set to 11155111 for Sepolia.
  expectedChainId: 31337,
  // Optional: used only when MetaMask SDK fallback is needed.
  infuraApiKey: "",
  contractAbi: [
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "address", "name": "instructor", "type": "address" },
        { "indexed": false, "internalType": "bool", "name": "isAuthorized", "type": "bool" }
      ],
      "name": "InstructorUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": false, "internalType": "string", "name": "srn", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "name", "type": "string" }
      ],
      "name": "StudentRegistered",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "sessionId", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "section", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "subject", "type": "string" },
        { "indexed": false, "internalType": "string", "name": "courseCode", "type": "string" },
        { "indexed": false, "internalType": "uint256", "name": "startTimestamp", "type": "uint256" },
        { "indexed": false, "internalType": "uint256", "name": "endTimestamp", "type": "uint256" }
      ],
      "name": "SessionCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "sessionId", "type": "uint256" }
      ],
      "name": "SessionClosed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "uint256", "name": "sessionId", "type": "uint256" },
        { "indexed": false, "internalType": "string", "name": "srn", "type": "string" },
        { "indexed": false, "internalType": "bool", "name": "present", "type": "bool" },
        { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
      ],
      "name": "AttendanceMarked",
      "type": "event"
    },
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
        { "internalType": "string", "name": "section", "type": "string" },
        { "internalType": "string", "name": "subject", "type": "string" },
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
      "inputs": [],
      "name": "getRegisteredStudents",
      "outputs": [
        {
          "components": [
            { "internalType": "string", "name": "srn", "type": "string" },
            { "internalType": "string", "name": "name", "type": "string" }
          ],
          "internalType": "struct StudentAttendance.StudentView[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
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
      "inputs": [
        { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
        { "internalType": "string[]", "name": "srns", "type": "string[]" },
        { "internalType": "bool[]", "name": "presents", "type": "bool[]" }
      ],
      "name": "markAttendanceBatch",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "nextSessionId",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "name": "sessions",
      "outputs": [
        { "internalType": "uint256", "name": "id", "type": "uint256" },
        { "internalType": "string", "name": "section", "type": "string" },
        { "internalType": "string", "name": "subject", "type": "string" },
        { "internalType": "string", "name": "courseCode", "type": "string" },
        { "internalType": "uint256", "name": "startTimestamp", "type": "uint256" },
        { "internalType": "uint256", "name": "endTimestamp", "type": "uint256" },
        { "internalType": "bool", "name": "isOpen", "type": "bool" }
      ],
      "stateMutability": "view",
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
    },
    {
      "inputs": [
        { "internalType": "uint256", "name": "sessionId", "type": "uint256" },
        { "internalType": "string", "name": "srn", "type": "string" }
      ],
      "name": "isAttendanceMarked",
      "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};
