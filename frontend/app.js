const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const logBox = document.getElementById("logBox");
const reportOutput = document.getElementById("reportOutput");
const recentStudentsEl = document.getElementById("recentStudents");
const recentSessionsEl = document.getElementById("recentSessions");
const recentMarksEl = document.getElementById("recentMarks");

const registerStudentForm = document.getElementById("registerStudentForm");
const createSessionForm = document.getElementById("createSessionForm");
const markAttendanceForm = document.getElementById("markAttendanceForm");
const reportForm = document.getElementById("reportForm");

let provider;
let signer;
let contract;
let mmSdk;

const TIME_MIN = "08:00";
const TIME_MAX = "17:00";
const RECORD_LIMIT = 6;

const uiRecords = {
  students: [],
  sessions: [],
  marks: []
};

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  logBox.textContent += `[${timestamp}] ${message}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

async function connectWallet() {
  if (!window.APP_CONFIG || !window.APP_CONFIG.contractAddress) {
    appendLog("Missing APP_CONFIG. Check frontend/config.js");
    return;
  }

  const ethereumProvider = await resolveEthereumProvider();
  provider = new ethers.BrowserProvider(ethereumProvider);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();

  const address = await signer.getAddress();
  walletStatus.textContent = `Connected as ${address}`;

  contract = new ethers.Contract(
    window.APP_CONFIG.contractAddress,
    window.APP_CONFIG.contractAbi,
    signer
  );

  appendLog("Wallet connected and contract initialized.");
}

async function resolveEthereumProvider() {
  if (window.ethereum) {
    appendLog("Using injected MetaMask provider.");
    return window.ethereum;
  }

  const sdkGlobal = window.MetaMaskSDK;
  if (!sdkGlobal) {
    throw new Error("MetaMask extension not found and SDK is unavailable.");
  }

  const SdkConstructor = sdkGlobal.MetaMaskSDK || sdkGlobal.default || sdkGlobal;
  if (!mmSdk) {
    const options = {
      dappMetadata: {
        name: "ChainAttend",
        url: window.location.href
      }
    };

    if (window.APP_CONFIG && window.APP_CONFIG.infuraApiKey) {
      options.infuraAPIKey = window.APP_CONFIG.infuraApiKey;
    }

    mmSdk = new SdkConstructor(options);
  }

  appendLog("Using MetaMask SDK fallback provider.");
  await mmSdk.connect();
  return mmSdk.getProvider();
}

async function ensureContract() {
  if (!contract) {
    throw new Error("Connect wallet first.");
  }
}

function isWithinAllowedTimeRange(time) {
  return time >= TIME_MIN && time <= TIME_MAX;
}

function toUnixSeconds(dateString, timeString) {
  const localDateTime = new Date(`${dateString}T${timeString}:00`);
  if (Number.isNaN(localDateTime.getTime())) {
    throw new Error("Invalid date/time selection.");
  }

  return Math.floor(localDateTime.getTime() / 1000);
}

function pushRecord(listName, item) {
  uiRecords[listName].unshift(item);
  uiRecords[listName] = uiRecords[listName].slice(0, RECORD_LIMIT);
  renderRecords();
}

function renderRecordList(container, list, renderFn, emptyMessage) {
  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "record-empty";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "record-item";

    const main = document.createElement("div");
    main.className = "record-main";
    main.textContent = renderFn(entry).title;

    const detail = document.createElement("p");
    detail.textContent = renderFn(entry).detail;

    card.appendChild(main);
    card.appendChild(detail);
    container.appendChild(card);
  });
}

function renderRecords() {
  renderRecordList(
    recentStudentsEl,
    uiRecords.students,
    (entry) => ({
      title: `${entry.srn} | ${entry.name}`,
      detail: `Registered at ${entry.time}`
    }),
    "No student registrations yet."
  );

  renderRecordList(
    recentSessionsEl,
    uiRecords.sessions,
    (entry) => ({
      title: `${entry.courseCode} | Session #${entry.sessionId}`,
      detail: `${entry.slot} on ${entry.date}`
    }),
    "No sessions created yet."
  );

  renderRecordList(
    recentMarksEl,
    uiRecords.marks,
    (entry) => ({
      title: `${entry.srn} | ${entry.present ? "Present" : "Absent"}`,
      detail: `Session #${entry.sessionId} at ${entry.time}`
    }),
    "No attendance marked yet."
  );
}

function extractSessionIdFromReceipt(receipt) {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed && parsed.name === "SessionCreated") {
        return parsed.args.sessionId.toString();
      }
    } catch {
      // Ignore logs not emitted by this contract/interface.
    }
  }

  return "-";
}

registerStudentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const srn = document.getElementById("studentSrn").value.trim();
  const name = document.getElementById("studentName").value.trim();

  try {
    await ensureContract();
    appendLog(`Registering student ${srn} ...`);
    const tx = await contract.registerStudent(srn, name);
    await tx.wait();
    appendLog(`Student ${srn} registered.`);
    pushRecord("students", {
      srn,
      name,
      time: new Date().toLocaleTimeString()
    });
    registerStudentForm.reset();
  } catch (error) {
    appendLog(`Register failed: ${error.reason || error.message}`);
  }
});

createSessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const courseCode = document.getElementById("courseCode").value.trim();
  const sessionDate = document.getElementById("sessionDate").value;
  const sessionSlot = document.getElementById("sessionSlot").value;
  const [startTime, endTime] = sessionSlot.split("|");

  try {
    await ensureContract();
    if (!isWithinAllowedTimeRange(startTime) || !isWithinAllowedTimeRange(endTime)) {
      throw new Error("Time range must be between 08:00 and 17:00.");
    }

    const startTimestamp = toUnixSeconds(sessionDate, startTime);
    const endTimestamp = toUnixSeconds(sessionDate, endTime);

    if (startTimestamp >= endTimestamp) {
      throw new Error("End time must be after start time.");
    }

    appendLog(`Creating session for ${courseCode} ...`);
    const tx = await contract.createSession(courseCode, startTimestamp, endTimestamp);
    const receipt = await tx.wait();
    const sessionId = extractSessionIdFromReceipt(receipt);
    appendLog(`Session created. Tx hash: ${receipt.hash}`);
    pushRecord("sessions", {
      courseCode,
      sessionId,
      slot: `${startTime} - ${endTime}`,
      date: sessionDate
    });
    createSessionForm.reset();
    setSessionDefaults();
  } catch (error) {
    appendLog(`Session creation failed: ${error.reason || error.message}`);
  }
});

markAttendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sessionId = document.getElementById("sessionId").value;
  const srn = document.getElementById("markSrn").value.trim();
  const present = document.getElementById("presentFlag").value === "true";

  try {
    await ensureContract();
    appendLog(`Marking attendance for ${srn} in session ${sessionId} ...`);
    const tx = await contract.markAttendance(sessionId, srn, present);
    await tx.wait();
    appendLog(`Attendance marked for ${srn}.`);
    pushRecord("marks", {
      sessionId,
      srn,
      present,
      time: new Date().toLocaleTimeString()
    });
    markAttendanceForm.reset();
  } catch (error) {
    appendLog(`Attendance marking failed: ${error.reason || error.message}`);
  }
});

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const srn = document.getElementById("reportSrn").value.trim();

  try {
    await ensureContract();
    appendLog(`Fetching report for ${srn} ...`);
    const [resultSrn, name, presentCount, totalMarked, percentageScaled] = await contract.getStudent(srn);

    const percent = Number(percentageScaled) / 100;
    reportOutput.innerHTML = `
      <strong>SRN:</strong> ${resultSrn}<br />
      <strong>Name:</strong> ${name}<br />
      <strong>Present:</strong> ${presentCount}<br />
      <strong>Total Marked:</strong> ${totalMarked}<br />
      <strong>Attendance:</strong> ${percent.toFixed(2)}%
    `;
  } catch (error) {
    reportOutput.textContent = "Unable to fetch report.";
    appendLog(`Report fetch failed: ${error.reason || error.message}`);
  }
});

connectWalletBtn.addEventListener("click", connectWallet);

function setSessionDefaults() {
  const dateInput = document.getElementById("sessionDate");
  const slotInput = document.getElementById("sessionSlot");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  dateInput.value = `${year}-${month}-${day}`;
  slotInput.value = "08:00|09:00";
}

setSessionDefaults();
renderRecords();
appendLog("Ready. Set contract address in frontend/config.js and connect wallet.");
