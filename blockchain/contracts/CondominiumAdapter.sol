// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interface/ICondominium.sol";

contract CondominiumAdapter {
    
    ICondominium private condominium;
    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    function getImplementationAddress() external view initialized returns(address) {
        return address(condominium);
    }

    function init(address newImplementation) external onlyOwner  {
        require(newImplementation != address(0), "Endereco vazio nao permitido");

        condominium = ICondominium(newImplementation);
    }

    function getManager() external view initialized returns(address) {
        return condominium.getManager();
    }

    function getQuota() external view initialized returns(uint) {
        return condominium.getQuota();
    }

    function addResident(address resident, uint16 residenceId) external initialized {
        return condominium.addResident(resident, residenceId);
    }

    function removeResident(address resident) external initialized {
        return condominium.removeResident(resident);
    }

    function setCounselor(address resident, bool isEntering) external initialized {
        return condominium.setCounselor(resident, isEntering);
    }

    function addTopic(string memory title, string memory description, lib.Category category, uint amount, address responsible) external initialized {
        return condominium.addTopic(title, description, category, amount, responsible);
    }

    function editTopic(string memory topicToEdit, string memory description, uint amount, address responsible) external initialized {
        lib.TopicUpdate memory topic = condominium.editTopic(topicToEdit, description, amount, responsible);

        emit TopicChanged(topic.id, topic.title, topic.status);
    }

    function removeTopic(string memory title) external initialized {
        lib.TopicUpdate memory topic =  condominium.removeTopic(title);

        emit TopicChanged(topic.id, topic.title, topic.status);
    }

    function openVoting(string memory title) external initialized {
        lib.TopicUpdate memory topic =  condominium.openVoting(title);

        emit TopicChanged(topic.id, topic.title, topic.status);
    }

    function vote(string memory title, lib.Options option) external initialized{
        return condominium.vote(title, option);
    }

    function closeVoting(string memory title) external initialized {
        lib.TopicUpdate memory topic =  condominium.closeVoting(title);

        emit TopicChanged(topic.id, topic.title, topic.status);

        if(topic.status == lib.Status.APPROVED) {
            if(topic.category == lib.Category.CHANGE_MANAGER) {
                emit ManagerChanged(condominium.getManager());
            }
            else if (topic.category == lib.Category.CHANGE_QUOTA) {
                emit QuotaChanged(condominium.getQuota());
            }
        }
    }

    function voteCount(string memory title) external view initialized returns (uint) {
        return condominium.voteCount(title);
    }

    function payQuota(uint16 residenceId) external payable initialized {
        return condominium.payQuota{ value: msg.value }(residenceId);
    }

    function transfer(string memory topicTitle, uint amount) external initialized {
        lib.TransferReceipt memory receipt = condominium.transfer(topicTitle, amount);

        emit Transfer(receipt.to, receipt.amount, receipt.topic);
    }


    event QuotaChanged(uint amount);

    event ManagerChanged(address manager);

    event TopicChanged(bytes32 indexed topicId, string title, lib.Status indexed status);

    event Transfer(address to, uint indexed amount, string topic);



    modifier onlyOwner() {
        require(msg.sender == owner, "Somente o sindico pode executar esta operacao");
        _;
    }

    modifier initialized() {
        require(address(condominium) != address(0), "Contrato nao inicializado");
        _;
    }
}
