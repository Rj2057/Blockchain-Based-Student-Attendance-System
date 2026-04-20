// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract StudentAttendance {
    address public owner;

    struct Student {
        string srn;
        string name;
        bool exists;
        uint256 presentCount;
        uint256 totalMarked;
    }

    struct StudentView {
        string srn;
        string name;
    }

    struct Session {
        uint256 id;
        string section;
        string subject;
        string courseCode;
        uint256 startTimestamp;
        uint256 endTimestamp;
        bool isOpen;
    }

    mapping(address => bool) public instructors;
    mapping(bytes32 => Student) private students;
    mapping(uint256 => Session) public sessions;
    mapping(uint256 => mapping(bytes32 => bool)) private attendanceBySession;
    StudentView[] private studentIndex;

    uint256 public nextSessionId = 1;

    event InstructorUpdated(address indexed instructor, bool isAuthorized);
    event StudentRegistered(string srn, string name);
    event SessionCreated(uint256 indexed sessionId, string section, string subject, string courseCode, uint256 startTimestamp, uint256 endTimestamp);
    event SessionClosed(uint256 indexed sessionId);
    event AttendanceMarked(uint256 indexed sessionId, string srn, bool present, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call");
        _;
    }

    modifier onlyInstructor() {
        require(instructors[msg.sender], "Only instructor can call");
        _;
    }

    constructor() {
        owner = msg.sender;
        instructors[msg.sender] = true;
        emit InstructorUpdated(msg.sender, true);
    }

    function setInstructor(address instructor, bool isAuthorized) external onlyOwner {
        require(instructor != address(0), "Invalid instructor address");
        instructors[instructor] = isAuthorized;
        emit InstructorUpdated(instructor, isAuthorized);
    }

    function registerStudent(string calldata srn, string calldata name) external onlyInstructor {
        bytes32 srnHash = _hashSRN(srn);
        require(!students[srnHash].exists, "Student already registered");
        require(bytes(name).length > 0, "Name is required");

        students[srnHash] = Student({
            srn: srn,
            name: name,
            exists: true,
            presentCount: 0,
            totalMarked: 0
        });

        studentIndex.push(StudentView({
            srn: srn,
            name: name
        }));

        emit StudentRegistered(srn, name);
    }

    function createSession(
        string calldata section,
        string calldata subject,
        string calldata courseCode,
        uint256 startTimestamp,
        uint256 endTimestamp
    ) external onlyInstructor returns (uint256) {
        require(bytes(section).length > 0, "Section is required");
        require(bytes(subject).length > 0, "Subject is required");
        require(bytes(courseCode).length > 0, "Course code is required");
        require(startTimestamp < endTimestamp, "Invalid time range");

        uint256 sessionId = nextSessionId;
        sessions[sessionId] = Session({
            id: sessionId,
            section: section,
            subject: subject,
            courseCode: courseCode,
            startTimestamp: startTimestamp,
            endTimestamp: endTimestamp,
            isOpen: true
        });

        nextSessionId += 1;
        emit SessionCreated(sessionId, section, subject, courseCode, startTimestamp, endTimestamp);

        return sessionId;
    }

    function closeSession(uint256 sessionId) external onlyInstructor {
        Session storage session = sessions[sessionId];
        require(session.id != 0, "Session does not exist");
        require(session.isOpen, "Session already closed");

        session.isOpen = false;
        emit SessionClosed(sessionId);
    }

    function markAttendance(uint256 sessionId, string calldata srn, bool present) external onlyInstructor {
        _markAttendance(sessionId, srn, present);
    }

    function markAttendanceBatch(uint256 sessionId, string[] calldata srns, bool[] calldata presents) external onlyInstructor {
        require(srns.length > 0, "No students provided");
        require(srns.length == presents.length, "Array length mismatch");

        for (uint256 i = 0; i < srns.length; i++) {
            _markAttendance(sessionId, srns[i], presents[i]);
        }
    }

    function getStudent(string calldata srn) external view returns (string memory, string memory, uint256, uint256, uint256) {
        bytes32 srnHash = _hashSRN(srn);
        Student storage student = students[srnHash];
        require(student.exists, "Student not registered");

        uint256 percentageScaled = 0;
        if (student.totalMarked > 0) {
            percentageScaled = (student.presentCount * 10000) / student.totalMarked;
        }

        return (student.srn, student.name, student.presentCount, student.totalMarked, percentageScaled);
    }

    function getRegisteredStudents() external view returns (StudentView[] memory) {
        return studentIndex;
    }

    function isAttendanceMarked(uint256 sessionId, string calldata srn) external view returns (bool) {
        bytes32 srnHash = _hashSRN(srn);
        return attendanceBySession[sessionId][srnHash];
    }

    function _hashSRN(string calldata srn) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(srn));
    }

    function _markAttendance(uint256 sessionId, string calldata srn, bool present) private {
        Session storage session = sessions[sessionId];
        require(session.id != 0, "Session does not exist");
        require(session.isOpen, "Session is closed");

        bytes32 srnHash = _hashSRN(srn);
        Student storage student = students[srnHash];
        require(student.exists, "Student not registered");
        require(!attendanceBySession[sessionId][srnHash], "Attendance already marked for this session");

        attendanceBySession[sessionId][srnHash] = true;
        student.totalMarked += 1;

        if (present) {
            student.presentCount += 1;
        }

        emit AttendanceMarked(sessionId, student.srn, present, block.timestamp);
    }
}
