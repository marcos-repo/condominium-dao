import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import hre from "hardhat";

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
        NO = 3,
        ABSTENTION = 4
    }

  async function deployFixture() {

    const [manager, resident, council] = await hre.ethers.getSigners();

    const Condominium = await hre.ethers.getContractFactory("Condominium");
    const contract = await Condominium.deploy();

    return { contract, manager, resident, council };
  }

    it("Should be residence", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      expect(await contract.residenceExists(2102)).eq(true);
    });

    it("Should add resident", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);
      expect(await contract.isResident(resident.address)).eq(true);
    });

    it("Should NOT add resident(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      const instance = contract.connect(resident);

      await expect(instance.addResident(resident.address, 2102))
      .to
      .be
      .revertedWith("Somente o sindico ou conselheiros podem executar esta operacao");
    });

    it("Should NOT add resident(residence does not exists)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await expect(contract.addResident(resident.address, 9999))
      .to
      .be
      .revertedWith("Esta residencia nao existe");
    });

    it("Should remove resident", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      await contract.removeResident(resident.address);      
      expect(await contract.isResident(resident.address)).eq(false);
    });

    it("Should NOT remove resident(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await expect(instance.removeResident(resident.address))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT remove resident(counselor)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      await expect(contract.removeResident(resident.address))
      .to
      .be
      .revertedWith("Um conselheiro nao pode ser removido");
    });

    it("Should set counselor", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      expect(await contract.counselors(resident.address)).eq(true);
    });

    it("Should add resident(council)", async function () {
      const { contract, manager, resident, council } = await loadFixture(deployFixture);

      await contract.addResident(council.address, 2102);
      await contract.setCounselor(council.address, true);

      const instance = contract.connect(council);

      await instance.addResident(resident.address, 2103);
      expect(await contract.isResident(resident.address)).eq(true);
    });

    it("Should NOT set counselor(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);

      await expect(instance.setCounselor(resident.address, true))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT set counselor(resident)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await expect(contract.setCounselor(resident.address, true))
      .to
      .be
      .revertedWith("O conselheiro precisa ser um morador");
    });

    it("Should remove counselor", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2102);

      await contract.setCounselor(resident.address, true);

      await contract.setCounselor(resident.address, false);
      expect(await contract.counselors(resident.address)).eq(false);

    });

    // it("Should set manager", async function () {
    //   const { contract, manager, resident } = await loadFixture(deployFixture);

    //   await contract.setManager(resident.address);

    //   expect(await contract.manager()).eq(resident.address);
    // });

    // it("Should NOT set manager(permission)", async function () {
    //   const { contract, manager, resident } = await loadFixture(deployFixture);

    //   const instance = contract.connect(resident);

    //   await expect(instance.setManager(resident.address))
    //   .to
    //   .be
    //   .revertedWith("Somente o sindico pode executar esta operacao");
    // });

    // it("Should NOT set manager(address)", async function () {
    //   const { contract, manager, resident } = await loadFixture(deployFixture);

    //   await expect(contract.setManager("0x0000000000000000000000000000000000000000"))
    //   .to
    //   .be
    //   .revertedWith("Endereco de carteira invalido");
    // });

    it("Should add topic(manager)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");
      expect(await contract.topicExists("topico 1")).eq(true);
    });

    it("Should add topic(resident)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
      
      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await instance.addTopic("topico 1", "descricao 1");

      expect(await contract.topicExists("topico 1")).eq(true);
    });

    it("Should NOT add topic(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
      const instance = contract.connect(resident);

      await expect(instance.addTopic("topico 1", "descricao 1"))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

     it("Should NOT add topic(duplicated)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await expect(contract.addTopic("topico 1", "descricao 1"))
      .to
      .be
      .revertedWith("Topico ja existente");
    });

    it("Should remove topic(manager)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.removeTopic("topico 1");
      expect(await contract.topicExists("topico 1")).eq(false);
    });

    it("Should NOT remove topic(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
      
      await contract.addResident(resident.address, 2102);

      const instance = contract.connect(resident);
      await instance.addTopic("topico 1", "descricao 1");

      await expect(instance.removeTopic("topico 1"))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

    it("Should NOT remove topic(not exists)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);
      
      await expect(contract.removeTopic("topico 1"))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT remove topic(status)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      await expect(contract.removeTopic("topico 1"))
      .to
      .be
      .revertedWith("Este topico nao pode ser removido");
    });

    it("Should open topic", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      expect((await contract.getTopic("topico 1")).status).eq(Status.VOTING);
    });

    it("Should NOT open topic(does not exists)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await expect(contract.openVoting("topico 1"))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT open topic(status)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      await expect(contract.openVoting("topico 1"))
      .to
      .be
      .revertedWith("Somente topicos ociosos podem ter a votacao iniciada");
    });

    it("Should vote", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await instance.vote("topico 1", Options.NO);

      expect(await contract.voteCount("topico 1")).eq(1);
    });

    it("Should NOT vote(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");
      
      const instance = contract.connect(resident);

      await expect(instance.vote("topico 1", Options.EMPTY))
      .to
      .be
      .revertedWith("Somente o sindico ou moradores podem executar esta operacao");
    });

    it("Should NOT vote(empty vote)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);

      await expect(instance.vote("topico 1", Options.EMPTY))
      .to
      .be
      .revertedWith("O Voto nao pode ser vazio");
    });

    it("Should NOT vote(topic does not exists)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);

      await expect(instance.vote("topico 1", Options.NO))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT vote(status)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await expect(instance.vote("topico 1", Options.NO))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser votados");
    });

    it("Should NOT vote(duplicated vote)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");
      
      await contract.addResident(resident.address, 2201);

      const instance = contract.connect(resident);
      await instance.vote("topico 1", Options.YES);

      await expect(instance.vote("topico 1", Options.YES))
      .to
      .be
      .revertedWith("Uma residencia so pode votar uma vez");
    });

    it("Should close voting", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      await contract.closeVoting("topico 1");

      expect((await contract.getTopic("topico 1")).status).not.eq(Status.IDLE);
      expect((await contract.getTopic("topico 1")).status).not.eq(Status.VOTING);
    });

    it("Should close voting(result APPROVED)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      await contract.vote("topico 1", Options.YES);

      await contract.addResident(resident.address, 2201);
      const instance = contract.connect(resident);      
      await instance.vote("topico 1", Options.YES);

      await contract.closeVoting("topico 1");
      const topic = await contract.getTopic("topico 1");

      expect(topic.status).eq(Status.APPROVED);
    });

    it("Should close voting(result DENIED)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addResident(resident.address, 2201);

      await contract.addTopic("topico 1", "descricao 1");
      await contract.openVoting("topico 1");
      await contract.vote("topico 1", Options.NO);

      const instance = contract.connect(resident);      
      await instance.vote("topico 1", Options.NO);

      await contract.closeVoting("topico 1");

      const topic = await contract.getTopic("topico 1");
      expect(topic.status).eq(Status.DENIED);
    });

    it("Should NOT close voting(permission)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");

      await contract.openVoting("topico 1");

      await contract.addResident(resident.address, 2201);
      const instance = contract.connect(resident);      
      await instance.vote("topico 1", Options.YES);

      await expect(instance.closeVoting("topico 1"))
      .to
      .be
      .revertedWith("Somente o sindico pode executar esta operacao");
    });

     it("Should NOT close voting(does not exists)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await expect(contract.closeVoting("topico 1"))
      .to
      .be
      .revertedWith("Topico inexistente");
    });

    it("Should NOT close voting(status)", async function () {
      const { contract, manager, resident } = await loadFixture(deployFixture);

      await contract.addTopic("topico 1", "descricao 1");
      expect(await contract.topicExists("topico 1")).eq(true);

      await expect(contract.closeVoting("topico 1"))
      .to
      .be
      .revertedWith("Somente topicos em votacao podem ser finalizados");
    });

});
