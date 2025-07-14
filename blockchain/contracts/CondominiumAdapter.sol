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

    function addResident(address resident, uint16 residenceId ) external initialized {
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
        return condominium.editTopic(topicToEdit, description, amount, responsible);
    }

    function removeTopic(string memory title) external initialized {
        return condominium.removeTopic(title);
    }

    function openVoting(string memory title) external initialized {
        return condominium.openVoting(title);
    }

    function vote(string memory title, lib.Options option) external initialized{
        return condominium.vote(title, option);
    }

    function closeVoting(string memory title) external initialized{
        return condominium.closeVoting(title);
    }

    function voteCount(string memory title) external view initialized returns (uint) {
        return condominium.voteCount(title);
    }

    function payQuota(uint16 residenceId) external payable initialized {
        return condominium.payQuota{ value: msg.value }(residenceId);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Somente o sindico pode executar esta operacao");
        _;
    }

    modifier initialized() {
        require(address(condominium) != address(0), "Contrato nao inicializado");
        _;
    }
}
