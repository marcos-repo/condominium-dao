// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interface/ICondominium.sol";

contract Condominium is ICondominium {
    
    address public manager;
    mapping(uint16 => bool) public residences; //(unidade => true)
    mapping(address => uint16) public residents; // wallet => unidade(1101, 2101)
    mapping(address => bool) public counselors; //conselheiro => true
    mapping(bytes32 => lib.Topic) public topics;
    mapping(bytes32 => lib.Vote[]) public votings;
    mapping (uint16 => uint) payments;
    uint public monthlyQuota = 0.01 ether;

    constructor() {
        manager = msg.sender;

        for (uint16 i = 1; i <= 2; i++) {
            for (uint16 j = 1; j < 5; j++) {
                for (uint16 k = 0; k <= 5; k++) {
                    residences[(i * 1000) + (j * 100) + k] = true;
                }
            }
        }
    }

    function getManager() external view returns(address) {
        return manager;
    }

    function getQuota() external view returns(uint) {
        return monthlyQuota;
    }

    function addResident(address resident, uint16 residenceId ) external onlyCouncil validAddress(resident) {
        require(residenceExists(residenceId), "Esta residencia nao existe");
        residents[resident] = residenceId;
    }

    function removeResident(address resident) external onlyManager {
        require(!counselors[resident], "Um conselheiro nao pode ser removido");
        delete residents[resident];
    }

    function setCounselor(address resident, bool isEntering) external onlyManager validAddress(resident) {
        if (isEntering) {
            require(isResident(resident), "O conselheiro precisa ser um morador");
            counselors[resident] = true;
        } else delete counselors[resident];
    }

    function getTopic(string memory title) public view returns(lib.Topic memory) {
        return topics[getTopicId(title)];
    }

    function topicExists(string memory title) public view returns(bool) {
        return getTopic(title).createDate > 0;
    }

    function addTopic(string memory title, string memory description, lib.Category category, uint amount, address responsible) external onlyResident {
        require(!topicExists(title), "Topico ja existente");

        if(amount > 0) {
            require(
                category == lib.Category.SPENT || category == lib.Category.CHANGE_QUOTA,
                "Categoria invalida");
        }

        lib.Topic memory newTopic = lib.Topic({
            title: title,
            description: description,
            createDate: block.timestamp,
            startDate: 0,
            endDate: 0,
            status: lib.Status.IDLE,
            category: category,
            amount: amount,
            responsible: responsible != address(0) ? responsible : tx.origin
        });

        topics[getTopicId(title)] = newTopic;
    }

    function editTopic(string memory topicToEdit, string memory description, uint amount, address responsible) 
        external onlyManager returns (lib.TopicUpdate memory) {
        
        lib.Topic memory topic = getTopic(topicToEdit);

        require(topic.createDate > 0, "Topico inexistente");
        require(topic.status == lib.Status.IDLE, "Somente topicos com status IDLE podem ser editados");

        bytes32 topicId = getTopicId(topic.title);

        if(bytes(description).length > 0)
            topics[topicId].description = description;
        
        if(amount > 0)
            topics[topicId].amount = amount;

        if(responsible != address(0))
            topics[topicId].responsible = responsible;

        return lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: topic.status
        });
    }

    function removeTopic(string memory title) 
        external onlyManager returns (lib.TopicUpdate memory) {

        lib.Topic memory topic = getTopic(title);

        require(topic.createDate > 0, "Topico inexistente");
        require(topic.status == lib.Status.IDLE, "Este topico nao pode ser removido");

        delete topics[getTopicId(title)];

        return lib.TopicUpdate({
            id: getTopicId(title),
            title: topic.title,
            category: topic.category,
            status: lib.Status.DELETED
        });
    }

    function openVoting(string memory title) 
        external onlyManager returns (lib.TopicUpdate memory) {
        lib.Topic memory topic = getTopic(title);
        require(topic.createDate > 0, "Topico inexistente");
        require(topic.status == lib.Status.IDLE, "Somente topicos ociosos podem ter a votacao iniciada");

        bytes32 topicId = getTopicId(title);
        topics[topicId].status = lib.Status.VOTING;
        topics[topicId].startDate = block.timestamp;

        return lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: lib.Status.VOTING
        });
    }

    function vote(string memory title, lib.Options option) external onlyResident {
        require(option != lib.Options.EMPTY, "O Voto nao pode ser vazio");

        lib.Topic memory topic = getTopic(title);
        require(topic.createDate > 0, "Topico inexistente");
        require(topic.status == lib.Status.VOTING, "Somente topicos em votacao podem ser votados");
    
        uint16 residence = residents[tx.origin];
        bytes32 topicId = getTopicId(title);

        lib.Vote[] memory votes = votings[topicId];
        for (uint i = 0; i < votes.length; i++) {
            require(votes[i].residence != residence, "Uma residencia so pode votar uma vez");
        }

        lib.Vote memory newVote = lib.Vote({
            residence: residence,
            resident: tx.origin,
            option: option,
            timestamp: block.timestamp
        });

        votings[topicId].push(newVote);
    }

    function closeVoting(string memory title) 
        external onlyManager returns (lib.TopicUpdate memory) {
        lib.Topic memory topic = getTopic(title);
        require(topic.createDate > 0, "Topico inexistente");
        require(topic.status == lib.Status.VOTING, "Somente topicos em votacao podem ser finalizados");

        uint minimumVotes = 5;

        if(topic.category == lib.Category.SPENT)
            minimumVotes = 10;
        else if(topic.category == lib.Category.CHANGE_MANAGER) 
            minimumVotes = 15;
        else if(topic.category == lib.Category.CHANGE_QUOTA)
            minimumVotes = 20;

        uint totalVotes = voteCount(title);
        require(totalVotes >= minimumVotes, "Esta votacao ainda nao atingiu a quantidade minima de votos para ser encerrada");

        uint8 yes = 0;
        uint8 no = 0;

        bytes32 topicId = getTopicId(title);
        lib.Vote[] memory votes = votings[topicId];

        for (uint8 i = 0; i < votes.length; i++) {
            if(votes[i].option == lib.Options.YES)
                yes++;
            else if(votes[i].option == lib.Options.NO)
                no++;  
        }

        lib.Status newStatus = (yes > no) ? lib.Status.APPROVED : lib.Status.DENIED;

        topics[topicId].status = newStatus;
        topics[topicId].endDate = block.timestamp;

        if(newStatus == lib.Status.APPROVED) {
            if(topic.category == lib.Category.CHANGE_QUOTA) {
                monthlyQuota = topic.amount;
            }
            else if (topic.category == lib.Category.CHANGE_MANAGER) {
                manager = topic.responsible;
            }
        }

        return lib.TopicUpdate({
            id: topicId,
            title: topic.title,
            category: topic.category,
            status: newStatus
        });
    }

    function voteCount(string memory title) public view returns (uint) {
        bytes32 topicId = getTopicId(title);
        return votings[topicId].length;
    }

    function payQuota(uint16 residenceId) external payable {
        require(residenceExists(residenceId), "Esta residencia nao existe");
        require(msg.value >= monthlyQuota, "Valor invalido");
        require(block.timestamp > payments[residenceId] + (30 * 24 * 60 * 60), "Voce nao pode pagar duas vezes no mesmo mes");

        payments[residenceId] = block.timestamp;
    }

    function transfer(string memory topicTitle, uint amount) 
        external onlyManager  returns (lib.TransferReceipt memory) {
        require(address(this).balance >= amount, "Saldo insuficiente");

        lib.Topic memory topic = getTopic(topicTitle);

        require(
                topic.status == lib.Status.APPROVED && topic.category == lib.Category.SPENT,
                "Somente topicos do tipo SPENT e Aprovados podem ser gastos");
        require(topic.amount >= amount, "O valor deve ser menor ou igual ao aprovado no topico");

        payable(topic.responsible).transfer(amount);

        bytes32 topicId = getTopicId(topicTitle);
        topics[topicId].status = lib.Status.SPENT;

        return lib.TransferReceipt({
            to: topic.responsible,
            amount: amount,
            topic: topicTitle
         });
    }

    function getTopicId(string memory title) private  pure returns (bytes32 topicId) {
        topicId = keccak256(bytes(title));
    }

    modifier onlyManager() {
        require(tx.origin == manager, "Somente o sindico pode executar esta operacao");
        _;
    }

    modifier onlyCouncil() {
        require(tx.origin == manager || counselors[tx.origin], "Somente o sindico ou conselheiros podem executar esta operacao");
        _;
    }

    modifier onlyResident() {
        require(tx.origin == manager || isResident(tx.origin), "Somente o sindico ou moradores podem executar esta operacao");
        require(tx.origin == manager || block.timestamp < payments[residents[tx.origin]] + (30 * 24 * 60 * 60), 
                "O morador deve estar adimplente");
        _;
    }

    modifier validAddress(address addr) {
        require(addr != address(0), "Endereco de carteira invalido");
        _;
    }

    function residenceExists(uint16 residenceId) public view returns (bool) {
        return residences[residenceId];
    }

    function isResident(address resident) public view returns (bool) {
        return residents[resident] > 0;
    }
}
