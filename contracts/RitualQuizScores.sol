// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Ritual Quiz Scores
/// @notice Lets players save their final quiz score on Ritual testnet.
contract RitualQuizScores {
    struct Entry {
        address player;
        string discord;
        uint8 score;
        uint32 completionMs;
        uint64 timestamp;
    }

    Entry[] private _entries;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public entryCount;

    event ScoreSaved(
        address indexed player,
        string discord,
        uint8 score,
        uint32 completionMs,
        uint64 timestamp,
        uint256 index
    );

    /// @notice Save a finished round. Score must be 0..10.
    function saveScore(string calldata discord, uint8 score, uint32 completionMs) external {
        require(score <= 10, "score>10");
        require(bytes(discord).length >= 2 && bytes(discord).length <= 32, "bad name");

        uint64 ts = uint64(block.timestamp);
        _entries.push(Entry({
            player: msg.sender,
            discord: discord,
            score: score,
            completionMs: completionMs,
            timestamp: ts
        }));
        entryCount[msg.sender] += 1;
        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
        }

        emit ScoreSaved(msg.sender, discord, score, completionMs, ts, _entries.length - 1);
    }

    function totalEntries() external view returns (uint256) {
        return _entries.length;
    }

    function getEntry(uint256 index) external view returns (Entry memory) {
        return _entries[index];
    }
}
