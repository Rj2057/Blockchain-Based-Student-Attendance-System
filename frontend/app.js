const connectWalletBtn = document.getElementById("connectWalletBtn");
const walletStatus = document.getElementById("walletStatus");
const logBox = document.getElementById("logBox");
const reportOutput = document.getElementById("reportOutput");
const recentSubjectsEl = document.getElementById("recentSubjects");
const recentStudentsEl = document.getElementById("recentStudents");
const recentSessionsEl = document.getElementById("recentSessions");
const recentMarksEl = document.getElementById("recentMarks");
const sectionSelect = document.getElementById("sectionSelect");
const subjectSelect = document.getElementById("subjectSelect");
const courseCodeInput = document.getElementById("courseCode");
const sessionSelect = document.getElementById("sessionSelect");
const bulkAttendanceList = document.getElementById("bulkAttendanceList");
const bulkAllFlag = document.getElementById("bulkAllFlag");
const applyBulkAllBtn = document.getElementById("applyBulkAllBtn");
const bulkMarkBtn = document.getElementById("bulkMarkBtn");
const studentQrPreview = document.getElementById("studentQrPreview");
const downloadStudentQrBtn = document.getElementById("downloadStudentQrBtn");
const startQrScanBtn = document.getElementById("startQrScanBtn");
const stopQrScanBtn = document.getElementById("stopQrScanBtn");
const qrReader = document.getElementById("qrReader");
const scanStatus = document.getElementById("scanStatus");

const registerStudentForm = document.getElementById("registerStudentForm");
const registerSubjectForm = document.getElementById("registerSubjectForm");
const createSessionForm = document.getElementById("createSessionForm");
const markAttendanceForm = document.getElementById("markAttendanceForm");
const reportForm = document.getElementById("reportForm");

let provider;
let signer;
let contract;
let mmSdk;
let qrScanner;
let qrScannerActive = false;
let qrStopInProgress = false;
let qrDecodeHandled = false;
let currentQrValue = "";
let blockchainSubjects = [];
let blockchainStudents = [];
let blockchainSessions = [];

const TIME_MIN = "08:00";
const TIME_MAX = "17:00";
const RECORD_LIMIT = 6;

const uiRecords = {
  subjects: [],
  students: [],
  sessions: [],
  marks: []
};

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  logBox.textContent += `[${timestamp}] ${message}\n`;
  logBox.scrollTop = logBox.scrollHeight;
}

function clearElement(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function normalizeStudentResult(student) {
  return {
    srn: student?.srn ?? student?.[0] ?? "",
    name: student?.name ?? student?.[1] ?? ""
  };
}

function normalizeSubjectResult(subject) {
  return {
    subject: subject?.subject ?? subject?.[0] ?? "",
    courseCode: subject?.courseCode ?? subject?.[1] ?? ""
  };
}

function renderSubjectDropdown() {
  clearElement(subjectSelect);

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = blockchainSubjects.length ? "Select a registered subject" : "No subjects registered yet";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  subjectSelect.appendChild(defaultOption);

  if (!blockchainSubjects.length) {
    subjectSelect.disabled = true;
    courseCodeInput.value = "";
    return;
  }

  subjectSelect.disabled = false;
  blockchainSubjects.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${item.subject} | ${item.courseCode}`;
    subjectSelect.appendChild(option);
  });

  if (subjectSelect.value === "") {
    subjectSelect.value = "0";
  }

  syncSelectedSubject();
}

function renderStudentDropdown() {
  clearElement(bulkAttendanceList);

  if (!blockchainStudents.length) {
    const empty = document.createElement("p");
    empty.className = "record-empty";
    empty.textContent = "No students available for bulk attendance.";
    bulkAttendanceList.appendChild(empty);
    bulkMarkBtn.disabled = true;
    applyBulkAllBtn.disabled = true;
    return;
  }

  bulkMarkBtn.disabled = false;
  applyBulkAllBtn.disabled = false;

  blockchainStudents.forEach((student) => {
    const row = document.createElement("div");
    row.className = "bulk-attendance-row";

    const details = document.createElement("div");
    details.className = "bulk-attendance-details";
    details.innerHTML = `<strong>${student.srn}</strong><span>${student.name}</span>`;

    const statusWrap = document.createElement("div");
    statusWrap.className = "bulk-attendance-status";

    const statusSelect = document.createElement("select");
    statusSelect.className = "bulk-attendance-select";
    statusSelect.dataset.srn = student.srn;
    statusSelect.innerHTML = `
      <option value="true">Present</option>
      <option value="false">Absent</option>
    `;

    statusWrap.appendChild(statusSelect);
    row.appendChild(details);
    row.appendChild(statusWrap);
    bulkAttendanceList.appendChild(row);
  });
}

function formatSessionLabel(session) {
  const start = new Date(Number(session.startTimestamp) * 1000);
  const end = new Date(Number(session.endTimestamp) * 1000);
  const date = Number.isNaN(start.getTime()) ? "Unknown date" : start.toLocaleDateString();
  const slot = Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
    ? "-"
    : `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return `#${session.id} | ${session.section} | ${session.subject} | ${session.courseCode} | ${date} ${slot}`;
}

function normalizeSessionResult(session) {
  return {
    id: Number(session?.id ?? session?.[0] ?? 0),
    section: session?.section ?? session?.[1] ?? "",
    subject: session?.subject ?? session?.[2] ?? "",
    courseCode: session?.courseCode ?? session?.[3] ?? "",
    startTimestamp: session?.startTimestamp ?? session?.[4] ?? 0,
    endTimestamp: session?.endTimestamp ?? session?.[5] ?? 0,
    isOpen: session?.isOpen ?? session?.[6] ?? false
  };
}

function renderSessionDropdown() {
  clearElement(sessionSelect);
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select a session";
  defaultOption.selected = true;
  sessionSelect.appendChild(defaultOption);

  const defaultOptionScanner = document.createElement("option");
  defaultOptionScanner.value = "";
  defaultOptionScanner.textContent = "Select a session";
  defaultOptionScanner.selected = true;
  document.getElementById("sessionSelectScanner").innerHTML = "";
  document.getElementById("sessionSelectScanner").appendChild(defaultOptionScanner);

  if (!blockchainSessions.length) {
    sessionSelect.disabled = true;
    document.getElementById("sessionSelectScanner").disabled = true;
    return;
  }

  sessionSelect.disabled = false;
  document.getElementById("sessionSelectScanner").disabled = false;
  blockchainSessions.forEach((session) => {
    const option = document.createElement("option");
    option.value = String(session.id);
    option.textContent = formatSessionLabel(session);
    sessionSelect.appendChild(option);

    const optionScanner = document.createElement("option");
    optionScanner.value = String(session.id);
    optionScanner.textContent = formatSessionLabel(session);
    document.getElementById("sessionSelectScanner").appendChild(optionScanner);
  });
}

async function refreshBlockchainSubjects() {
  if (!contract) {
    blockchainSubjects = [];
    renderSubjectDropdown();
    return;
  }

  const subjects = await contract.getRegisteredSubjects();
  blockchainSubjects = Array.from(subjects, normalizeSubjectResult).filter((item) => item.subject && item.courseCode);
  renderSubjectDropdown();

  uiRecords.subjects = blockchainSubjects.map((item) => ({
    subject: item.subject,
    courseCode: item.courseCode,
    time: "On-chain"
  }));
  renderRecords();
}

async function refreshBlockchainSessions() {
  if (!contract) {
    blockchainSessions = [];
    renderSessionDropdown();
    return;
  }

  const nextSessionIdRaw = await contract.nextSessionId();
  const nextSessionId = Number(nextSessionIdRaw);
  if (nextSessionId <= 1) {
    blockchainSessions = [];
    renderSessionDropdown();
    return;
  }

  const ids = Array.from({ length: nextSessionId - 1 }, (_, index) => index + 1);
  const sessions = await Promise.all(ids.map((id) => contract.sessions(id)));
  blockchainSessions = sessions.map(normalizeSessionResult);
  renderSessionDropdown();
}

async function refreshBlockchainStudents() {
  if (!contract) {
    blockchainStudents = [];
    renderStudentDropdown();
    return;
  }

  const students = await contract.getRegisteredStudents();
  blockchainStudents = Array.from(students, normalizeStudentResult).filter((student) => student.srn);
  renderStudentDropdown();

  uiRecords.students = blockchainStudents.map((student) => ({
    srn: student.srn,
    name: student.name,
    time: "On-chain"
  }));
  renderRecords();
}

function syncSelectedSubject() {
  if (subjectSelect.value === "") {
    courseCodeInput.value = "";
    return;
  }

  const selectedIndex = Number(subjectSelect.value);
  const subject = blockchainSubjects[selectedIndex];
  if (!subject) {
    courseCodeInput.value = "";
    return;
  }

  courseCodeInput.value = subject.courseCode;
}

function syncSelectedSession() {
  const selectedSessionId = sessionSelect.value;
  if (selectedSessionId) {
    document.getElementById("sessionId").value = selectedSessionId;
    applySelectedSessionMode(selectedSessionId);
  }
}

function applySelectedSessionMode(sessionIdValue) {
  const sessionId = Number(sessionIdValue);
  const session = blockchainSessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }
  appendLog(`Selected session #${session.id}. Bulk mark will include all registered students.`);
}

function showEmptyQrState(message) {
  currentQrValue = "";
  clearElement(studentQrPreview);
  const placeholder = document.createElement("span");
  placeholder.textContent = message;
  studentQrPreview.appendChild(placeholder);
  downloadStudentQrBtn.disabled = true;
}

function renderStudentQr(srn) {
  const value = srn.trim();
  if (!value) {
    showEmptyQrState("Type an SRN or register a student to generate QR");
    return;
  }

  currentQrValue = value;
  clearElement(studentQrPreview);
  new QRCode(studentQrPreview, {
    text: value,
    width: 190,
    height: 190,
    colorDark: "#10171d",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
  downloadStudentQrBtn.disabled = false;
}

function downloadQrImage() {
  if (!currentQrValue) {
    return;
  }

  const canvas = studentQrPreview.querySelector("canvas");
  const image = studentQrPreview.querySelector("img");
  const source = canvas?.toDataURL("image/png") || image?.src;

  if (!source) {
    appendLog("QR image is not ready yet.");
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = source;
  anchor.download = `qr-${currentQrValue}.png`;
  anchor.click();
}

function setScanStatus(message) {
  scanStatus.textContent = message;
}

function extractSrnFromQrPayload(payload) {
  const trimmed = payload.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.srn === "string") {
      return parsed.srn.trim();
    }
  } catch {
    // Plain text SRN is also valid.
  }

  if (trimmed.startsWith("SRN:")) {
    return trimmed.slice(4).trim();
  }

  return trimmed;
}

function getScannerPrerequisiteMessage() {
  if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    return "Camera access needs localhost or HTTPS. Open the app through http://localhost or a secure site, not file://.";
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser does not allow camera access. Use a modern browser like Chrome or Edge.";
  }

  if (!window.Html5Qrcode) {
    return "QR scanner library did not load. Check internet access and refresh the page.";
  }

  return "";
}

async function stopQrScanner() {
  if (qrStopInProgress) {
    return;
  }

  if (!qrScanner) {
    qrReader.classList.add("hidden");
    setScanStatus("Scanner is idle.");
    startQrScanBtn.disabled = false;
    stopQrScanBtn.disabled = true;
    return;
  }

  qrStopInProgress = true;
  try {
    if (qrScannerActive) {
      await qrScanner.stop();
    }
    await qrScanner.clear();
  } catch {
    // Ignore stop/clear race errors from camera stream teardown.
  }

  qrScannerActive = false;
  qrDecodeHandled = false;
  qrStopInProgress = false;
  qrReader.classList.add("hidden");
  setScanStatus("Scanner stopped.");
  startQrScanBtn.disabled = false;
  stopQrScanBtn.disabled = true;
}

async function startQrScanner() {
  const prerequisiteMessage = getScannerPrerequisiteMessage();
  if (prerequisiteMessage) {
    throw new Error(prerequisiteMessage);
  }

  if (qrScannerActive) {
    return;
  }

  qrReader.classList.remove("hidden");
  setScanStatus("Starting camera ...");
  startQrScanBtn.disabled = true;
  stopQrScanBtn.disabled = false;

  if (!qrScanner) {
    qrScanner = new Html5Qrcode("qrReader");
  }

  qrDecodeHandled = false;

  try {
    await qrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      async (decodedText) => {
        if (qrDecodeHandled) {
          return;
        }

        const srn = extractSrnFromQrPayload(decodedText);
        if (!srn) {
          appendLog("QR scan returned empty text.");
          return;
        }

        qrDecodeHandled = true;

        document.getElementById("markSrn").value = srn;
        appendLog(`QR scanned successfully: ${srn}`);
        setScanStatus(`Scanned SRN: ${srn}`);
        await stopQrScanner();
      },
      () => {
        // keep scanning quietly until a code is found
      }
    );

    qrScannerActive = true;
    setScanStatus("Camera active. Point it at a student QR code.");
  } catch (error) {
    qrScannerActive = false;
    qrDecodeHandled = false;
    qrStopInProgress = false;
    qrReader.classList.add("hidden");
    startQrScanBtn.disabled = false;
    stopQrScanBtn.disabled = true;
    throw error;
  }
}

function formatUserError(error) {
  const rawMessage = error?.reason || error?.shortMessage || error?.message || error?.name || "Unknown error";

  if (rawMessage.includes("RPC endpoint returned too many errors")) {
    return "RPC endpoint is overloaded/unavailable. For local deploy, switch MetaMask to Localhost 8545, keep `npm run node` running, then reconnect wallet.";
  }

  if (error?.code === 4001) {
    return "Request was rejected in MetaMask.";
  }

  if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
    return "Camera permission was denied. Allow camera access in the browser and try again.";
  }

  if (error?.name === "NotFoundError") {
    return "No camera was found. Connect a webcam or check browser camera access.";
  }

  if (error?.name === "NotReadableError") {
    return "Camera is already in use by another app or tab. Close other camera apps and try again.";
  }

  if (error?.name === "OverconstrainedError") {
    return "The camera constraints are not supported by your device. Try another browser or camera.";
  }

  return rawMessage;
}

function formatDebugError(error) {
  const parts = [];
  if (error?.name) parts.push(`name=${error.name}`);
  if (error?.code !== undefined) parts.push(`code=${error.code}`);
  if (error?.message) parts.push(`message=${error.message}`);
  if (error?.reason) parts.push(`reason=${error.reason}`);
  if (error?.shortMessage) parts.push(`shortMessage=${error.shortMessage}`);
  return parts.length ? parts.join(" | ") : JSON.stringify(error);
}

async function ensureExpectedNetwork() {
  const expectedChainId = window.APP_CONFIG?.expectedChainId;
  if (!expectedChainId) {
    return;
  }

  const network = await provider.getNetwork();
  const activeChainId = Number(network.chainId);
  if (activeChainId === Number(expectedChainId)) {
    return;
  }

  const expectedHex = `0x${Number(expectedChainId).toString(16)}`;
  if (window.ethereum?.request) {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedHex }]
      });
      return;
    } catch (switchError) {
      // 4902 means the chain is not added in MetaMask yet.
      if (switchError?.code === 4902 && Number(expectedChainId) === 31337) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x7a69",
            chainName: "Hardhat Localhost",
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["http://127.0.0.1:8545"]
          }]
        });
        return;
      }
    }
  }

  throw new Error(`Wrong network selected. Please switch to chain id ${expectedChainId}.`);
}

async function connectWallet() {
  if (!window.APP_CONFIG || !window.APP_CONFIG.contractAddress) {
    appendLog("Missing APP_CONFIG. Check frontend/config.js");
    return;
  }

  const ethereumProvider = await resolveEthereumProvider();
  provider = new ethers.BrowserProvider(ethereumProvider);
  await provider.send("eth_requestAccounts", []);
  await ensureExpectedNetwork();
  signer = await provider.getSigner();

  const address = await signer.getAddress();
  walletStatus.textContent = `Connected as ${address}`;

  contract = new ethers.Contract(
    window.APP_CONFIG.contractAddress,
    window.APP_CONFIG.contractAbi,
    signer
  );

  await refreshBlockchainSubjects();
  await refreshBlockchainStudents();
  await refreshBlockchainSessions();
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
    recentSubjectsEl,
    uiRecords.subjects,
    (entry) => ({
      title: `${entry.subject} | ${entry.courseCode}`,
      detail: `Registered at ${entry.time}`
    }),
    "No subjects registered yet."
  );

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
      title: `${entry.section} | ${entry.subject} | ${entry.courseCode} | Session #${entry.sessionId}`,
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
    renderStudentQr(srn);
    await refreshBlockchainStudents();
    registerStudentForm.reset();
  } catch (error) {
    appendLog(`Register failed: ${formatUserError(error)}`);
  }
});

registerSubjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const subject = document.getElementById("subjectName").value.trim();
  const courseCode = document.getElementById("subjectCode").value.trim();

  try {
    await ensureContract();
    appendLog(`Registering subject ${subject} ...`);
    const tx = await contract.registerSubject(subject, courseCode);
    await tx.wait();
    appendLog(`Subject ${subject} registered.`);
    await refreshBlockchainSubjects();
    registerSubjectForm.reset();
  } catch (error) {
    appendLog(`Subject registration failed: ${formatUserError(error)}`);
  }
});

createSessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const section = sectionSelect.value;
  const selectedSubject = subjectSelect.value === "" ? null : blockchainSubjects[Number(subjectSelect.value)];
  const subject = selectedSubject?.subject || "";
  const courseCode = selectedSubject?.courseCode || courseCodeInput.value.trim();
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
    if (!selectedSubject) {
      throw new Error("Add and select a subject before creating a session.");
    }

    appendLog(`Creating session for ${courseCode} ...`);
    const tx = await contract.createSession(
      section,
      subject,
      courseCode,
      startTimestamp,
      endTimestamp
    );
    const receipt = await tx.wait();
    const sessionId = extractSessionIdFromReceipt(receipt);
    appendLog(`Session created. Tx hash: ${receipt.hash}`);
    pushRecord("sessions", {
      section,
      subject,
      courseCode,
      sessionId,
      slot: `${startTime} - ${endTime}`,
      date: sessionDate
    });
    await refreshBlockchainSessions();
    sessionSelect.value = String(sessionId);
    syncSelectedSession();
    createSessionForm.reset();
    syncSelectedSubject();
    setSessionDefaults();
  } catch (error) {
    appendLog(`Session creation failed: ${formatUserError(error)}`);
  }
});

markAttendanceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const sessionId = document.getElementById("sessionIdScanner").value;
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
    appendLog(`Attendance marking failed: ${formatUserError(error)}`);
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
    const message = formatUserError(error);
    reportOutput.innerHTML = `<span style="color: #b42318; font-weight: 600;">${message}</span>`;
    appendLog(`Report fetch failed: ${message}`);
  }
});

connectWalletBtn.addEventListener("click", connectWallet);
downloadStudentQrBtn.addEventListener("click", downloadQrImage);
subjectSelect.addEventListener("change", () => {
  syncSelectedSubject();
});
sessionSelect.addEventListener("change", () => {
  syncSelectedSession();
});
bulkMarkBtn.addEventListener("click", async () => {
  const sessionId = document.getElementById("sessionId").value;

  try {
    await ensureContract();
    if (!sessionId) {
      throw new Error("Select a session first.");
    }
    const statusSelects = Array.from(bulkAttendanceList.querySelectorAll("select.bulk-attendance-select"));
    if (!statusSelects.length) {
      throw new Error("No registered students available for bulk mark.");
    }

    const studentsForBatch = statusSelects.map((select) => select.dataset.srn);
    const presentFlags = statusSelects.map((select) => select.value === "true");

    appendLog(`Bulk marking ${studentsForBatch.length} students in session ${sessionId} ...`);
    const tx = await contract.markAttendanceBatch(sessionId, studentsForBatch, presentFlags);
    await tx.wait();

    studentsForBatch.forEach((srn, index) => {
      pushRecord("marks", {
        sessionId,
        srn,
        present: presentFlags[index],
        time: new Date().toLocaleTimeString()
      });
    });

    appendLog(`Bulk attendance marked for ${studentsForBatch.length} students.`);
  } catch (error) {
    appendLog(`Bulk attendance failed: ${formatUserError(error)}`);
  }
});
applyBulkAllBtn.addEventListener("click", () => {
  const value = bulkAllFlag.value;
  Array.from(bulkAttendanceList.querySelectorAll("select.bulk-attendance-select")).forEach((select) => {
    select.value = value;
  });
});
startQrScanBtn.addEventListener("click", async () => {
  try {
    await startQrScanner();
  } catch (error) {
    const message = formatUserError(error);
    appendLog(`QR scanner failed: ${message}`);
    appendLog(`QR scanner debug: ${formatDebugError(error)}`);
    setScanStatus(message);
    startQrScanBtn.disabled = false;
    stopQrScanBtn.disabled = true;
  }
});
stopQrScanBtn.addEventListener("click", async () => {
  try {
    await stopQrScanner();
  } catch (error) {
    appendLog(`Could not stop scanner: ${formatUserError(error)}`);
  }
});
document.getElementById("studentSrn").addEventListener("input", (event) => {
  renderStudentQr(event.target.value);
});
document.getElementById("sessionId").addEventListener("input", (event) => {
  applySelectedSessionMode(event.target.value);
});
document.getElementById("sessionSelectScanner").addEventListener("change", () => {
  const selectedSessionId = document.getElementById("sessionSelectScanner").value;
  if (selectedSessionId) {
    document.getElementById("sessionIdScanner").value = selectedSessionId;
  }
});
document.getElementById("sessionIdScanner").addEventListener("input", (event) => {
  applySelectedSessionMode(event.target.value);
});

function setSessionDefaults() {
  const dateInput = document.getElementById("sessionDate");
  const slotInput = document.getElementById("sessionSlot");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  const todayString = `${year}-${month}-${day}`;
  dateInput.value = todayString;
  dateInput.min = todayString;
  slotInput.value = "08:00|09:00";
  if (blockchainSubjects.length) {
    subjectSelect.value = "0";
    syncSelectedSubject();
  } else {
    subjectSelect.value = "";
    courseCodeInput.value = "";
  }
}

setSessionDefaults();
renderSubjectDropdown();
renderRecords();
renderStudentDropdown();
renderSessionDropdown();
showEmptyQrState("Type an SRN or register a student to generate QR");
appendLog("Ready. Set contract address in frontend/config.js and connect wallet.");
