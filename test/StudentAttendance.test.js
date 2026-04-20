const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StudentAttendance", function () {
  async function deployFixture() {
    const [owner, instructor, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("StudentAttendance");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, instructor, outsider };
  }

  it("allows owner to authorize instructor", async function () {
    const { contract, instructor } = await deployFixture();
    await contract.setInstructor(instructor.address, true);
    expect(await contract.instructors(instructor.address)).to.equal(true);
  });

  it("registers student, creates session, marks attendance", async function () {
    const { contract } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const startTimestamp = latestBlock.timestamp - 60;
    const endTimestamp = latestBlock.timestamp + 3600;

    await contract.registerStudent("PES1UG22CS001", "Aarya Rai");
    await contract.registerSubject("Blockchain", "BCS501");
    await contract.createSession(
      "H",
      "Blockchain",
      "BCS501",
      startTimestamp,
      endTimestamp
    );
    await contract.markAttendance(1, "PES1UG22CS001", true);

    const student = await contract.getStudent("PES1UG22CS001");
    expect(student[2]).to.equal(1n);
    expect(student[3]).to.equal(1n);

    const isMarked = await contract.isAttendanceMarked(1, "PES1UG22CS001");
    expect(isMarked).to.equal(true);
  });

  it("returns registered students for dropdowns", async function () {
    const { contract } = await deployFixture();

    await contract.registerStudent("PES1UG22CS001", "Aarya Rai");
    await contract.registerStudent("PES1UG22CS002", "Rohan");

    const students = await contract.getRegisteredStudents();
    expect(students.length).to.equal(2);
    expect(students[0][0]).to.equal("PES1UG22CS001");
    expect(students[0][1]).to.equal("Aarya Rai");
    expect(students[1][0]).to.equal("PES1UG22CS002");
    expect(students[1][1]).to.equal("Rohan");
  });

  it("returns registered subjects for dropdowns", async function () {
    const { contract } = await deployFixture();

    await contract.registerSubject("Blockchain", "BCS501");
    await contract.registerSubject("DBMS", "BCS303");

    const subjects = await contract.getRegisteredSubjects();
    expect(subjects.length).to.equal(2);
    expect(subjects[0][0]).to.equal("Blockchain");
    expect(subjects[0][1]).to.equal("BCS501");
    expect(subjects[1][0]).to.equal("DBMS");
    expect(subjects[1][1]).to.equal("BCS303");
  });

  it("requires subjects to be registered before creating sessions", async function () {
    const { contract } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const startTimestamp = latestBlock.timestamp - 60;
    const endTimestamp = latestBlock.timestamp + 3600;

    await expect(
      contract.createSession("H", "Blockchain", "BCS501", startTimestamp, endTimestamp)
    ).to.be.revertedWith("Subject must be registered first");
  });

  it("marks multiple students attendance in one transaction", async function () {
    const { contract } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const startTimestamp = latestBlock.timestamp - 60;
    const endTimestamp = latestBlock.timestamp + 3600;

    await contract.registerStudent("PES1UG22CS001", "Aarya Rai");
    await contract.registerStudent("PES1UG22CS002", "Rohan");
    await contract.registerSubject("Blockchain", "BCS501");
    await contract.createSession(
      "H",
      "Blockchain",
      "BCS501",
      startTimestamp,
      endTimestamp
    );

    await contract.markAttendanceBatch(
      1,
      ["PES1UG22CS001", "PES1UG22CS002"],
      [true, true]
    );

    const firstStudent = await contract.getStudent("PES1UG22CS001");
    const secondStudent = await contract.getStudent("PES1UG22CS002");

    expect(firstStudent[2]).to.equal(1n);
    expect(firstStudent[3]).to.equal(1n);
    expect(secondStudent[2]).to.equal(1n);
    expect(secondStudent[3]).to.equal(1n);
  });

  it("prevents unauthorized users from registering students", async function () {
    const { contract, outsider } = await deployFixture();
    await expect(
      contract.connect(outsider).registerStudent("PES1UG22CS002", "Rohan")
    ).to.be.revertedWith("Only instructor can call");
  });

  it("allows any registered student in a mandatory session", async function () {
    const { contract } = await deployFixture();
    const latestBlock = await ethers.provider.getBlock("latest");
    const startTimestamp = latestBlock.timestamp - 60;
    const endTimestamp = latestBlock.timestamp + 3600;

    await contract.registerStudent("PES1UG22CS001", "Aarya Rai");
    await contract.registerStudent("PES1UG22CS002", "Rohan");
    await contract.registerSubject("DBMS", "BCS303");

    await contract.createSession(
      "H",
      "DBMS",
      "BCS303",
      startTimestamp,
      endTimestamp
    );

    await contract.markAttendance(1, "PES1UG22CS001", true);
    await contract.markAttendance(1, "PES1UG22CS002", true);

    const firstStudent = await contract.getStudent("PES1UG22CS001");
    const secondStudent = await contract.getStudent("PES1UG22CS002");

    expect(firstStudent[2]).to.equal(1n);
    expect(secondStudent[2]).to.equal(1n);
  });
});
