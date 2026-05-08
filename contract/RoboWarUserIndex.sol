// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RoboWarUserIndex {
    address public owner;

    struct UserRecord {
        bytes32 dataRoot;
        string loginType;
        address submitter;
        uint256 timestamp;
    }

    mapping(address => UserRecord[]) private userRecords;

    event UserIndexed(
        address indexed walletAddress,
        bytes32 indexed dataRoot,
        string loginType,
        address indexed submitter,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        owner = newOwner;
    }

    function indexUser(
        address walletAddress,
        bytes32 dataRoot,
        string calldata loginType
    ) external onlyOwner {
        require(walletAddress != address(0), "Zero wallet");
        require(dataRoot != bytes32(0), "Zero root");

        userRecords[walletAddress].push(
            UserRecord({
                dataRoot: dataRoot,
                loginType: loginType,
                submitter: msg.sender,
                timestamp: block.timestamp
            })
        );

        emit UserIndexed(walletAddress, dataRoot, loginType, msg.sender, block.timestamp);
    }

    function getUserRecordCount(address walletAddress) external view returns (uint256) {
        return userRecords[walletAddress].length;
    }

    function getUserRecord(
        address walletAddress,
        uint256 index
    ) external view returns (bytes32 dataRoot, string memory loginType, address submitter, uint256 timestamp) {
        UserRecord storage record = userRecords[walletAddress][index];
        return (record.dataRoot, record.loginType, record.submitter, record.timestamp);
    }

    function getLatestUserRecord(
        address walletAddress
    ) external view returns (bytes32 dataRoot, string memory loginType, address submitter, uint256 timestamp) {
        uint256 count = userRecords[walletAddress].length;
        require(count > 0, "No records");

        UserRecord storage record = userRecords[walletAddress][count - 1];
        return (record.dataRoot, record.loginType, record.submitter, record.timestamp);
    }
}
