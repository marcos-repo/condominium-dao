// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interface/ICondominium.sol";

contract CondominiumAdapter {
    
    ICondominium private implementation;
    address public immutable owner;

    constructor() {
        owner = msg.sender;
    }

    function getImplementationAddress() external view returns(address) {
        return address(implementation);
    }

    function upgrade(address newImplementation) external onlyOwner {
       implementation = ICondominium(newImplementation);
    }

    function addResident(address resident, uint16 residenceId ) external {
        return implementation.addResident(resident, residenceId);
    }

    function removeResident(address resident) external {
        return implementation.removeResident(resident);
    }

    function setCounselor(address resident, bool isEntering) external {
        return implementation.setCounselor(resident, isEntering);
    }

    function addTopic(string memory title, string memory description) external {
        return implementation.addTopic(title, description);
    }

    function removeTopic(string memory title) external {
        return implementation.removeTopic(title);
    }

    function openVoting(string memory title) external {
        return implementation.openVoting(title);
    }

    function vote(string memory title, lib.Options option) external {
        return implementation.vote(title, option);
    }

    function closeVoting(string memory title) external {
        return implementation.closeVoting(title);
    }

    function voteCount(string memory title) external view returns (uint){
        return implementation.voteCount(title);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Somente o sindico pode executar esta operacao");
        _;
    }
}
