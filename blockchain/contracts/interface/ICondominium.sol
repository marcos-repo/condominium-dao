// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CondominiumLib as lib} from "../lib/CondominiumLib.sol";

interface ICondominium {

    function addResident(address resident, uint16 residenceId ) external;

    function removeResident(address resident) external ;

    function setCounselor(address resident, bool isEntering) external;

    function addTopic(string memory title, string memory description, lib.Category category, uint amount, address responsible) external;

    function editTopic(string memory topicToEdit, string memory description, uint amount, address responsible) external;

    function removeTopic(string memory title) external ;

    function openVoting(string memory title) external;

    function vote(string memory title, lib.Options option) external;

    function closeVoting(string memory title) external;

    function voteCount(string memory title) external view returns (uint);

    function payQuota(uint16 residenceId) external payable;

    function transfer(string memory topicTitle, uint amount) external;
}