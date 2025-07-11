import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Condominium } from "../typechain-types/contracts";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Condominium", function () {

  enum Status {
      IDLE = 0,
      VOTING = 1,
      APPROVED = 2, 
      DENIED = 3 
  }
    
  enum Options {
        EMPTY = 0,
        YES = 1,
        NO = 2,
        ABSTENTION = 3
  }

  enum Category {
      DECISION = 0,
      SPENT = 1,
      CHANGE_QUOTA = 2,
      CHANGE_MANAGER = 3
  }

  const title = "topico 1";
  const description = "descricao topico 1"

  async function addResidents(contract: Condominium, count: number, accounts: SignerWithAddress[]) {
        for (let i = 1; i <= count; i++) {
          const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i / 5) + (i - (5 * Math.floor(( i - 1) / 5))));
          await contract.addResident(accounts[i-1].address, residenceId);     
        }
    }
  
  async function addVotes(contract: Condominium, count: number, accounts: SignerWithAddress[], option: Options | undefined) {
    for (let i = 1; i <= count; i++) {
      const instance = contract.connect(accounts[i-1]);

      await instance.vote(title, option == undefined ? Options.YES : option);  
    }
  }

  async function deployFixture() {
    const accounts = await hre.ethers.getSigners();
    const manager = accounts[0];

    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, accounts };
  }

    it("Should be residence", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      expect(await contract.residenceExists(2102)).eq(true);
    });

    it("Should add resident", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);
      expect(await contract.isResident(resident.address)).eq(true);
    });

    it("Should NOT add resident(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const resident = accounts[1];

      const instance = contract.connect(resident);

      await expect(instance.addResident(resident.address, 2102))
      .to
      .be
      .revertedWith("Somente o sindico ou conselheiros podem executar esta operacao");
    });

    it("Should NOT add resident(residence does not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await expect(contract.addResident(resident.address, 9999))
      .to
      .be
      .revertedWith("Esta residencia nao existe");
    });

    it("Should remove resident", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      await contract.removeResident(resident.address);      
      expect(await contract.isResident(resident.address)).eq(false);
    });

    it("Should NOT remove resident(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await expect(instance.removeResident(resident.address))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT remove resident(counselor)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      await expect(contract.removeResident(resident.address))
      .to
      .be
      .revertedWith("Um conselheiro nao pode ser removido");
    });

    it("Should set counselor", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      expect(await contract.counselors(resident.address)).eq(true);
    });

    it("Should add resident(council)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      const council = accounts[2];

      await contract.addResident(council.address, 2102);
      await contract.setCounselor(council.address, true);

      const instance = contract.connect(council);

      await instance.addResident(resident.address, 2103);
      expect(await contract.isResident(resident.address)).eq(true);
    });

    it("Should NOT set counselor(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);

      await expect(instance.setCounselor(resident.address, true))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT set counselor(resident)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await expect(contract.setCounselor(resident.address, true))
      .to
      .be
      .revertedWith("O conselheiro precisa ser um morador");
    });

    it("Should remove counselor", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      await contract.setCounselor(resident.address, false);
      expect(await contract.counselors(resident.address)).eq(false);

    });

    it("Should add topic(manager)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);
      expect(await contract.topicExists(title)).eq(true);
    });

    it("Should add topic(resident)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      
      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await instance.addTopic(title, description, Category.DECISION, 0, manager.address);

      expect(await contract.topicExists(title)).eq(true);
    });

    it("Should NOT add topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      const instance = contract.connect(resident);

      await expect(instance.addTopic(title, description, Category.DECISION, 0, manager.address))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

     it("Should NOT add topic(duplicated)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await expect(contract.addTopic(title, description, Category.DECISION, 1, manager.address))
      .to
      .be
      .revertedWith("Categoria invalida");
    });

     it("Should NOT add topic(invalid amount)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await expect(contract.addTopic(title, description, Category.DECISION, 0, manager.address))
      .to
      .be
      .revertedWith("Topico ja existente");
    });

    it("Should remove topic(manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.removeTopic(title);
      expect(await contract.topicExists(title)).eq(false);
    });

    it("Should NOT remove topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      
      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await instance.addTopic(title, description, Category.DECISION, 0, manager.address);

      await expect(instance.removeTopic(title))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT remove topic(not exists)", async function () {
      const { contract} = await loadFixture(deployFixture);
      
      await expect(contract.removeTopic(title))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT remove topic(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      await expect(contract.removeTopic(title))
      .to
      .be
      .revertedWith("Este topico nao pode ser removido");
    });

    it("Should open topic", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      expect((await contract.getTopic(title)).status).eq(Status.VOTING);
    });

    it("Should NOT open topic(does not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await expect(contract.openVoting(title))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT open topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      const instance = contract.connect(resident);

      await expect(instance.openVoting(title))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT open topic(status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      await expect(contract.openVoting(title))
      .to
      .be
      .revertedWith("Somente topicos ociosos podem ter a votacao iniciada");
    });

    it("Should vote", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await instance.vote(title, Options.NO);

      expect(await contract.voteCount(title)).eq(1);
    });

    it("Should NOT vote(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);
      
      const instance = contract.connect(resident);

      await expect(instance.vote(title, Options.EMPTY))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

    it("Should NOT vote(empty vote)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);

      await expect(instance.vote(title, Options.EMPTY))
      .to
      .be
      .revertedWith("O Voto nao pode ser vazio");
    });

    it("Should NOT vote(topic does not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);

      await expect(instance.vote(title, Options.NO))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT vote(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await expect(instance.vote(title, Options.NO))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser votados");
    });

    it("Should NOT vote(duplicated vote)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await instance.vote(title, Options.YES);

      await expect(instance.vote(title, Options.NO))
      .to
      .be
      .revertedWith("Uma residencia so pode votar uma vez");
    });

    it("Should close voting", async function () {
      const { contract, manager, accounts} = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      await addResidents(contract, 6, accounts);
      await addVotes(contract, 5, accounts);

      const instance = contract.connect(accounts[5]);
      instance.vote(title, Options.ABSTENTION);

      await contract.closeVoting(title);

      expect((await contract.getTopic(title)).status).not.eq(Status.IDLE);
      expect((await contract.getTopic(title)).status).not.eq(Status.VOTING);
    });

    it("Should close voting(result APPROVED)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      await addResidents(contract, 5, accounts);
      await addVotes(contract, 5, accounts);

      await contract.closeVoting(title);
      const topic = await contract.getTopic(title);

      expect(topic.status).eq(Status.APPROVED);
    });

    it("Should close voting(result DENIED)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      
      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);
      await contract.openVoting(title);
      
      await addResidents(contract, 5, accounts);
      await addVotes(contract, 5, accounts, Options.NO);

      await contract.closeVoting(title);

      const topic = await contract.getTopic(title);
      expect(topic.status).eq(Status.DENIED);
    });

    it("Should close voting(change Quota)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const newQuota = ethers.parseEther("0.02");

      await contract.addTopic(title, description, Category.CHANGE_QUOTA, newQuota, manager.address);
      await contract.openVoting(title);
      
      await addResidents(contract, 20, accounts);
      await addVotes(contract, 20, accounts, Options.YES);

      await contract.closeVoting(title);

      const monthlyQuota = await contract.monthlyQuota();
      expect(monthlyQuota).eq(newQuota);
    });

    it("Should close voting(change Manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.CHANGE_MANAGER, 0, resident.address);
      await contract.openVoting(title);
      
      await addResidents(contract, 15, accounts);
      await addVotes(contract, 15, accounts, Options.YES);

      await contract.closeVoting(title);

      const newManager = await contract.manager();
      expect(newManager).eq(resident.address);
    });

    it("Should close voting(Spent)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const spent = 1n;

      await contract.addTopic(title, description, Category.SPENT, spent, manager.address);

      await contract.openVoting(title);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);

      await contract.closeVoting(title);
      const topic = await contract.getTopic(title);

      expect(topic.status).eq(Status.APPROVED);
    });

    it("Should NOT close voting(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(title);

      await contract.addResident(resident.address, 2201);
      const instance = contract.connect(resident);      
      await instance.vote(title, Options.YES);

      await expect(instance.closeVoting(title))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

     it("Should NOT close voting(does not exists)", async function () {
      const { contract } = await loadFixture(deployFixture);

      await expect(contract.closeVoting(title))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT close voting(status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(title, description, Category.DECISION, 0, manager.address);
      expect(await contract.topicExists(title)).eq(true);

      await expect(contract.closeVoting(title))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser finalizados");
    });

    it("Should NOT close voting(insufficient votes)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const spent = 1n;

      await contract.addTopic(title, description, Category.SPENT, spent, manager.address);

      await contract.openVoting(title);

      await addResidents(contract, 2, accounts);
      await addVotes(contract, 2, accounts);

      await expect(contract.closeVoting(title))
      .to
      .be
      .revertedWith("Esta votacao ainda nao atingiu a quantidade minima de votos para ser encerrada");
    });

});
