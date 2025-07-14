
import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { CondominiumAdapter } from "../typechain-types/contracts";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { getContractFactory } from "@nomicfoundation/hardhat-ethers/types";

describe("Condominium Adapter", function () {

  enum Status {
        IDLE = 0,
        VOTING = 1,
        APPROVED = 2, 
        DENIED = 3,
        SPENT = 4
    }
    
  enum Options {
      EMPTY = 0,
      YES = 1,
      NO = 3,
      ABSTENTION = 4
  }

  enum Category {
      DECISION = 0,
      SPENT = 1,
      CHANGE_QUOTA = 2,
      CHANGE_MANAGER = 3
  }

  const topicTitle = "tipico 1";
  const description = "descricao topico 1";

  async function addResidents(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[]) {
      for (let i = 1; i <= count; i++) {
        const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i / 5) + (i - (5 * Math.floor(( i - 1) / 5))));
        await adapter.addResident(accounts[i].address, residenceId);     

        const instance = adapter.connect(accounts[i-1]);
        await instance.payQuota(residenceId, {value: ethers.parseEther("0.01")});
      }
  }

  async function addVotes(adapter: CondominiumAdapter, count: number, accounts: SignerWithAddress[]) {
    for (let i = 1; i <= count; i++) {
      const instance = adapter.connect(accounts[i]);

      await instance.vote(topicTitle, Options.YES);  
    }
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


    it("Should init", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      const implementationAddress = await adapter.getImplementationAddress();

      expect(implementationAddress).eq(implementation);
    });
    

    it("Should NOT init", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      const instance = adapter.connect(accounts[1]);

      await expect(instance.init(implementation))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should add resident", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      
      await adapter.addResident(accounts[1].address, 1301);

      expect(await implementation.isResident(accounts[1])).eq(true);
    });

    it("Should NOT add resident(init)", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.addResident(accounts[1].address, 1301))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should remove resident", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.removeResident(accounts[1].address);
      expect(await implementation.isResident(accounts[1])).eq(false);
    });

    it("Should NOT remove resident", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.removeResident(accounts[1].address))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should set counselor", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      await adapter.addResident(accounts[1].address, 1301);

      await adapter.setCounselor(accounts[1].address, true);

      expect(await implementation.counselors(accounts[1].address)).eq(true);
    });

    it("Should NOT set counselor", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.setCounselor(accounts[1].address, true))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should add topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address);

      expect(await implementation.topicExists(topicTitle)).eq(true);
    });

    it("Should NOT add topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

       await expect(adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should edit topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);
      
      const resident = accounts[2];
      const newDescription = "Nova descricao";
      const quota = ethers.parseEther("0.01");
      const newQuota = ethers.parseEther("0.02");

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, description, Category.SPENT, quota, manager.address);
      await adapter.editTopic(topicTitle, newDescription, newQuota, resident.address)

      const topic = await implementation.getTopic(topicTitle);

      expect(topic.description).eq(newDescription);
      expect(topic.amount).eq(newQuota);
      expect(topic.responsible).eq(resident.address);      
    });

    it("Should NOT edit topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      
      const resident = accounts[2];
      const newDescription = "Nova descricao";
      const newQuota = ethers.parseEther("0.02");

       await expect(adapter.editTopic(topicTitle, newDescription, newQuota, resident.address))
      .to
      .be
      .revertedWith("Contrato nao inicializado");    
    });

    it("Should remove topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address);

       await adapter.removeTopic(topicTitle);

       expect(await implementation.topicExists(topicTitle)).eq(false);
    });

    it("Should NOT remove topic", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.removeTopic(topicTitle))
      .to
      .be
      .revertedWith("Contrato nao inicializado"); 
    });

    it("Should open voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address);

      await adapter.openVoting(topicTitle);

      expect((await implementation.getTopic(topicTitle)).status).eq(Status.VOTING);
    });

    it("Should NOT open voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.openVoting(topicTitle))
      .to
      .be
      .revertedWith("Contrato nao inicializado"); 
    });

    it("Should vote", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);
      const resident = accounts[1];

      await adapter.init(implementation);
      await addResidents(adapter, 5, accounts);

      await adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address);
      await adapter.openVoting(topicTitle);
      
      const instance = adapter.connect(resident);
      await instance.vote(topicTitle, Options.YES);

      expect(await adapter.voteCount(topicTitle)).eq(1);
    });

    it("Should NOT vote", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const resident = accounts[1];

      const instance = adapter.connect(resident);

      await expect(instance.vote(topicTitle, Options.YES))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should close voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, "", Category.DECISION, 0, manager.address);
      await adapter.openVoting(topicTitle);

      await addResidents(adapter, 5, accounts);
      await addVotes(adapter, 5, accounts);
     
      await adapter.closeVoting(topicTitle);

      expect((await implementation.getTopic(topicTitle)).status).not.eq(Status.IDLE);
      expect((await implementation.getTopic(topicTitle)).status).not.eq(Status.VOTING);
    });

    it("Should NOT close voting", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);

      await expect(adapter.closeVoting(topicTitle))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });


    it("Should NOT vote count", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.voteCount(topicTitle))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });


    it("Should NOT get implementation address", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.getImplementationAddress())
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should NOT get implementation address(empty address)", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.init(ethers.ZeroAddress))
      .to
      .be
      .revertedWith("Endereco vazio nao permitido");
    });

    it("Should NOT pay quota", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);

      await expect(adapter.payQuota(1102, {value: 0}))
      .to
      .be
      .revertedWith("Contrato nao inicializado");
    });

    it("Should transfer", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const { implementation } = await loadFixture(deployImplementationFixture);
      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await adapter.init(implementation);
      await adapter.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await adapter.openVoting(topicTitle);

      await addResidents(adapter, 10, accounts);
      await addVotes(adapter, 10, accounts);
      await adapter.closeVoting(topicTitle);

      const balanceBefore = await ethers.provider.getBalance(implementation);
      const balanceWorkerBefore = await ethers.provider.getBalance(worker);

      await adapter.transfer(topicTitle, amount);

      const balanceAfter = await ethers.provider.getBalance(implementation);
      const balanceWorkerAfter = await ethers.provider.getBalance(worker);

      const topic = await implementation.getTopic(topicTitle);

      expect(balanceAfter).to.be.equal(balanceBefore - amount);
      expect(balanceWorkerAfter).to.be.equal(balanceWorkerBefore + amount);
      expect(topic.status).eq(Status.SPENT);      
    });

    it("Should NOT transfer", async function () {
      const { adapter, manager, accounts} = await loadFixture(deployAdapterFixture);
      const amount = ethers.parseEther("0.02");

      await expect(adapter.transfer(topicTitle, amount))
      .to
      .be
      .revertedWith("Contrato nao inicializado");      
    });
});
