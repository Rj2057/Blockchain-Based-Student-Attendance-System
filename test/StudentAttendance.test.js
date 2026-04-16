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
    await contract.createSession("BCS501", startTimestamp, endTimestamp);
    await contract.markAttendance(1, "PES1UG22CS001", true);

    const student = await contract.getStudent("PES1UG22CS001");
    expect(student[2]).to.equal(1n);
    expect(student[3]).to.equal(1n);

    const isMarked = await contract.isAttendanceMarked(1, "PES1UG22CS001");
    expect(isMarked).to.equal(true);
  });

  it("prevents unauthorized users from registering students", async function () {
    const { contract, outsider } = await deployFixture();
    await expect(
      contract.connect(outsider).registerStudent("PES1UG22CS002", "Rohan")
    ).to.be.revertedWith("Only instructor can call");
  });
});
