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
      DENIED = 3,
      SPENT = 4
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

  const topicTitle = "topico 1";
  const description = "descricao topico 1"
  const zeroAddress = ethers.ZeroAddress;

  async function addResidents(contract: Condominium, count: number, accounts: SignerWithAddress[]) {
        for (let i = 1; i <= count; i++) {
          const residenceId = (1000 * Math.ceil(i / 25)) + (100 * Math.ceil(i / 5) + (i - (5 * Math.floor(( i - 1) / 5))));
          await contract.addResident(accounts[i-1].address, residenceId);     

          const instance = contract.connect(accounts[i-1]);
          await instance.payQuota(residenceId, {value: ethers.parseEther("0.01")});
        }
    }
  
  async function addVotes(contract: Condominium, count: number, accounts: SignerWithAddress[], option: Options | undefined) {
    for (let i = 1; i <= count; i++) {
      const instance = contract.connect(accounts[i-1]);

      await instance.vote(topicTitle, option == undefined ? Options.YES : option);  
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

    it("Should NOT add resident(invalid address)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await expect(contract.addResident(zeroAddress, 1201))
      .to
      .be
      .revertedWith("Endereco de carteira invalido");
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

    it("Should NOT set counselor(invalid address)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addResident(resident.address, 2102);

      await expect(contract.setCounselor(zeroAddress, true))
      .to
      .be
      .revertedWith("Endereco de carteira invalido");
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

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      expect(await contract.topicExists(topicTitle)).eq(true);
    });

    it("Should add topic(resident)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[0];
      
      await addResidents(contract, 1, [resident]);

      const instance = contract.connect(resident);
      await instance.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      expect(await contract.topicExists(topicTitle)).eq(true);
    });

    it("Should NOT add topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      const instance = contract.connect(resident);

      await expect(instance.addTopic(topicTitle, description, Category.DECISION, 0, manager.address))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

     it("Should NOT add topic(duplicated)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await expect(contract.addTopic(topicTitle, description, Category.DECISION, 1, manager.address))
      .to
      .be
      .revertedWith("Categoria invalida");
    });

     it("Should NOT add topic(invalid amount)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await expect(contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address))
      .to
      .be
      .revertedWith("Topico ja existente");
    });

    it("Should edit topic(description)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const newDescription = "Nova descricao";

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      await contract.editTopic(topicTitle, newDescription, 0, zeroAddress);

      const topic = await contract.getTopic(topicTitle);

      expect(topic.description).eq(newDescription);
 
    });

    it("Should edit topic(amount)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const quota = ethers.parseEther("0.01");
      const newQuota = ethers.parseEther("0.02");

      await contract.addTopic(topicTitle, description, Category.SPENT, quota, manager.address);
      await contract.editTopic(topicTitle, "", newQuota, zeroAddress);

      const topic = await contract.getTopic(topicTitle);

      expect(topic.amount).eq(newQuota);
  
    });

    it("Should edit topic(responsible)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[2];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      
      await contract.editTopic(topicTitle, "", 0, resident.address);

      const topic = await contract.getTopic(topicTitle);

      expect(topic.responsible).eq(resident.address);      
    });

    it("Should NOT edit topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[2];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      
      const instance = contract.connect(resident);
      await expect(instance.editTopic(topicTitle, "", 0, resident.address))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
 
    });

    it("Should NOT edit topic(not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[2];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await expect(contract.editTopic("topico 2", "", 0, resident.address))
      .to
      .be
      .revertedWith("Topico inexistente");
 
    });

    it("Should NOT edit topic(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[2];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      await contract.openVoting(topicTitle);

      await expect(contract.editTopic(topicTitle, "", 0, resident.address))
      .to
      .be
      .revertedWith("Somente topicos com status IDLE podem ser editados");
 
    });

    it("Should remove topic(manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.removeTopic(topicTitle);
      expect(await contract.topicExists(topicTitle)).eq(false);
    });

    it("Should NOT remove topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];
      
      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      await instance.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await expect(instance.removeTopic(topicTitle))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT remove topic(not exists)", async function () {
      const { contract} = await loadFixture(deployFixture);
      
      await expect(contract.removeTopic(topicTitle))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT remove topic(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      await expect(contract.removeTopic(topicTitle))
      .to
      .be
      .revertedWith("Este topico nao pode ser removido");
    });

    it("Should open topic", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      expect((await contract.getTopic(topicTitle)).status).eq(Status.VOTING);
    });

    it("Should NOT open topic(does not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await expect(contract.openVoting(topicTitle))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT open topic(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      const instance = contract.connect(resident);

      await expect(instance.openVoting(topicTitle))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT open topic(status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      await expect(contract.openVoting(topicTitle))
      .to
      .be
      .revertedWith("Somente topicos ociosos podem ter a votacao iniciada");
    });

    it("Should vote", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      await instance.vote(topicTitle, Options.NO);

      expect(await contract.voteCount(topicTitle)).eq(1);
    });

    it("Should NOT vote(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);
      
      const instance = contract.connect(resident);

      await expect(instance.vote(topicTitle, Options.EMPTY))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

    it("Should NOT vote(empty vote)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);

      await expect(instance.vote(topicTitle, Options.EMPTY))
      .to
      .be
      .revertedWith("O Voto nao pode ser vazio");
    });

    it("Should NOT vote(topic does not exists)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);

      await expect(instance.vote(topicTitle, Options.NO))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT vote(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      await expect(instance.vote(topicTitle, Options.NO))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser votados");
    });

    it("Should NOT vote(duplicated vote)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      await instance.vote(topicTitle, Options.YES);

      await expect(instance.vote(topicTitle, Options.NO))
      .to
      .be
      .revertedWith("Uma residencia so pode votar uma vez");
    });

    it("Should NOT vote(defaulter)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      await contract.openVoting(topicTitle);
      await contract.addResident(resident, 2102);
      
      const instance = contract.connect(resident);

      await expect(instance.vote(topicTitle, Options.YES))
      .to
      .be
      .revertedWith("O morador deve estar adimplente");
    });

    it("Should close voting", async function () {
      const { contract, manager, accounts} = await loadFixture(deployFixture);

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      await addResidents(contract, 6, accounts);
      await addVotes(contract, 5, accounts);

      const instance = contract.connect(accounts[5]);
      instance.vote(topicTitle, Options.ABSTENTION);

      await contract.closeVoting(topicTitle);

      expect((await contract.getTopic(topicTitle)).status).not.eq(Status.IDLE);
      expect((await contract.getTopic(topicTitle)).status).not.eq(Status.VOTING);
    });

    it("Should close voting(result APPROVED)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      await addResidents(contract, 5, accounts);
      await addVotes(contract, 5, accounts);

      await contract.closeVoting(topicTitle);
      const topic = await contract.getTopic(topicTitle);

      expect(topic.status).eq(Status.APPROVED);
    });

    it("Should close voting(result DENIED)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      
      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 5, accounts);
      await addVotes(contract, 5, accounts, Options.NO);

      await contract.closeVoting(topicTitle);

      const topic = await contract.getTopic(topicTitle);
      expect(topic.status).eq(Status.DENIED);
    });

    it("Should close voting(change Quota)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const newQuota = ethers.parseEther("0.02");

      await contract.addTopic(topicTitle, description, Category.CHANGE_QUOTA, newQuota, manager.address);
      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 20, accounts);
      await addVotes(contract, 20, accounts, Options.YES);

      await contract.closeVoting(topicTitle);

      const monthlyQuota = await contract.monthlyQuota();
      expect(monthlyQuota).eq(newQuota);
    });

    it("Should close voting(change Manager)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.CHANGE_MANAGER, 0, resident.address);
      await contract.openVoting(topicTitle);
      
      await addResidents(contract, 15, accounts);
      await addVotes(contract, 15, accounts, Options.YES);

      await contract.closeVoting(topicTitle);

      const newManager = await contract.manager();
      expect(newManager).eq(resident.address);
    });

    it("Should close voting(Spent)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const spent = 1n;

      await contract.addTopic(topicTitle, description, Category.SPENT, spent, manager.address);

      await contract.openVoting(topicTitle);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);

      await contract.closeVoting(topicTitle);
      const topic = await contract.getTopic(topicTitle);

      expect(topic.status).eq(Status.APPROVED);
    });

    it("Should NOT close voting(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);

      await contract.openVoting(topicTitle);

      await addResidents(contract, 2, [manager, resident]);
      const instance = contract.connect(resident);      
      await instance.vote(topicTitle, Options.YES);

      await expect(instance.closeVoting(topicTitle))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

     it("Should NOT close voting(does not exists)", async function () {
      const { contract } = await loadFixture(deployFixture);

      await expect(contract.closeVoting(topicTitle))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT close voting(status)", async function () {
      const { contract, manager } = await loadFixture(deployFixture);

      await contract.addTopic(topicTitle, description, Category.DECISION, 0, manager.address);
      expect(await contract.topicExists(topicTitle)).eq(true);

      await expect(contract.closeVoting(topicTitle))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser finalizados");
    });

    it("Should NOT close voting(insufficient votes)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const spent = 1n;

      await contract.addTopic(topicTitle, description, Category.SPENT, spent, manager.address);

      await contract.openVoting(topicTitle);

      await addResidents(contract, 2, accounts);
      await addVotes(contract, 2, accounts);

      await expect(contract.closeVoting(topicTitle))
      .to
      .be
      .revertedWith("Esta votacao ainda nao atingiu a quantidade minima de votos para ser encerrada");
    });


    it("Should NOT pay quota(duplicated)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      const residenceId = 1102;

      await expect(instance.payQuota(residenceId, {value: ethers.parseEther("0.01")}))
      .to
      .be
      .revertedWith("Voce nao pode pagar duas vezes no mesmo mes");
    });

    it("Should NOT pay quota(value)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await addResidents(contract, 2, [manager, resident]);

      const instance = contract.connect(resident);
      const residenceId = 1102;

      await expect(instance.payQuota(residenceId, {value: ethers.parseEther("0.0000001")}))
      .to
      .be
      .revertedWith("Valor invalido");
    });

    it("Should NOT pay quota(residence)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);
      const resident = accounts[1];

      await expect(contract.payQuota(1, {value: ethers.parseEther("0.01")}))
      .to
      .be
      .revertedWith("Esta residencia nao existe");
    });

    it("Should transfer", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await contract.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await contract.openVoting(topicTitle);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);
      await contract.closeVoting(topicTitle);

      const balanceBefore = await ethers.provider.getBalance(contract);
      const balanceWorkerBefore = await ethers.provider.getBalance(worker);

      await contract.transfer(topicTitle, amount);

      const balanceAfter = await ethers.provider.getBalance(contract);
      const balanceWorkerAfter = await ethers.provider.getBalance(worker);

      const topic = await contract.getTopic(topicTitle);

      expect(balanceAfter).to.be.equal(balanceBefore - amount);
      expect(balanceWorkerAfter).to.be.equal(balanceWorkerBefore + amount);
      expect(topic.status).eq(Status.SPENT);      
    });

    it("Should NOT transfer(permission)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await contract.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await contract.openVoting(topicTitle);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);
      await contract.closeVoting(topicTitle);

      const instance = contract.connect(accounts[5]);
      

      await expect(instance.transfer(topicTitle, amount))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");      
    });

    it("Should NOT transfer(balance)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await contract.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await contract.openVoting(topicTitle);

      await expect(contract.transfer(topicTitle, amount))
      .to
      .be
      .revertedWith("Saldo insuficiente");      
    });

    it("Should NOT transfer(category)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await contract.addTopic(topicTitle, "", Category.DECISION, 0, worker);
      await contract.openVoting(topicTitle);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);
      await contract.closeVoting(topicTitle);

      await expect(contract.transfer(topicTitle, amount))
      .to
      .be
      .revertedWith("Somente topicos do tipo SPENT e Aprovados podem ser gastos");      
    });

    it("Should NOT transfer(status)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await addResidents(contract, 10, accounts);
      await contract.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await contract.openVoting(topicTitle);

      await expect(contract.transfer(topicTitle, amount))
      .to
      .be
      .revertedWith("Somente topicos do tipo SPENT e Aprovados podem ser gastos");      
    });

    it("Should NOT transfer(amount)", async function () {
      const { contract, manager, accounts } = await loadFixture(deployFixture);

      const amount = ethers.parseEther("0.02");
      const worker = accounts[15].address;

      await contract.addTopic(topicTitle, "", Category.SPENT, amount, worker);
      await contract.openVoting(topicTitle);

      await addResidents(contract, 10, accounts);
      await addVotes(contract, 10, accounts);
      await contract.closeVoting(topicTitle);

      await expect(contract.transfer(topicTitle, amount + 1000n))
      .to
      .be
      .revertedWith("O valor deve ser menor ou igual ao aprovado no topico");      
    });

});
