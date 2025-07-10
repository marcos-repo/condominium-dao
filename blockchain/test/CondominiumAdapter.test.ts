import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Condominium Adapter", function () {

  enum Status {
        IDLE = 0,
        VOTING = 1,
        APPROVED = 2, 
        DENIED = 3 
    }
    
    enum Options {
        EMPTY = 0,
        YES = 1,
        NO = 3,
        ABSTENTION = 4
    }

  async function deployAdapterFixture() {

    const accounts = await hre.ethers.getSigners();
    const manager = accounts[0];

    const CondominiumAdapter = await hre.ethers.getContractFactory("CondominiumAdapter");
    const adapter = await CondominiumAdapter.deploy();

    return { adapter, manager, accounts };
  }

  async function deployImplementationFixture() {
    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const implementation = await Condominium.deploy();

    return { implementation };
  }


    it("Should upgrade", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      const implementationAddress = await adapter.getImplementationAddress();

      expect(implementationAddress).eq(implementation);
    });

    it("Should NOT upgrade", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      const instance = adapter.connect(accounts[1]);

      await expect(instance.upgrade(implementation))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should add resident", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      
      await adapter.addResident(accounts[1].address, 1301);

      expect(await implementation.isResident(accounts[1])).eq(true);
    });

    it("Should remove resident", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.removeResident(accounts[1].address);
      expect(await implementation.isResident(accounts[1])).eq(false);
    });

    it("Should set counselor", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.setCounselor(accounts[1].address, true);

      expect(await implementation.counselors(accounts[1].address)).eq(true);
    });

    it("Should add topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      await adapter.addTopic("topico 1", "");

      expect(await implementation.topicExists("topico 1")).eq(true);
    });

    it("Should remove topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      await adapter.addTopic("topico 1", "");

       await adapter.removeTopic("topico 1");

       expect(await implementation.topicExists("topico 1")).eq(false);
    });

    it("Should open voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      await adapter.addTopic("topico 1", "");

      await adapter.openVoting("topico 1");

      expect((await implementation.getTopic("topico 1")).status).eq(Status.VOTING);
    });

    it("Should vote", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);
      const resident = accounts[1];

      await adapter.upgrade(implementation);
      await adapter.addResident(resident.address, 2201);
      await adapter.addTopic("topico 1", "");
      await adapter.openVoting("topico 1");
      
      const instance = adapter.connect(resident);
      await instance.vote("topico 1", Options.YES);

      expect(await adapter.voteCount("topico 1")).eq(1);
    });

    it("Should close voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.upgrade(implementation);
      await adapter.addTopic("topico 1", "");
      await adapter.openVoting("topico 1");
      await adapter.closeVoting("topico 1");

      expect((await implementation.getTopic("topico 1")).status).not.eq(Status.IDLE);
      expect((await implementation.getTopic("topico 1")).status).not.eq(Status.VOTING);
    });
});
