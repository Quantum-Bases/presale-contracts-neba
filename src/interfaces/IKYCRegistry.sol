// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IKYCRegistry {
    function isKYCApproved(address account) external view returns (bool);
    function addToWhitelist(address account) external;
    function removeFromWhitelist(address account) external;
    function batchAddToWhitelist(address[] calldata accounts) external;
    function batchRemoveFromWhitelist(address[] calldata accounts) external;
}

