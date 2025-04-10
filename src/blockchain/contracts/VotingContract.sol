//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VotingContract {
    struct Vote {
        string voterHash;
        string candidateId;
        string sessionId;
        uint256 timestamp;
        uint256 blockNumber;
    }

    struct ElectionSettings {
        string electionId;
        string electionName;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
    }

    ElectionSettings public election;
    string[] public candidates;
    Vote[] public votes;
    mapping(string => bool) public hasVoted;
    
    //events
    event VoteCast(string voterHash, string candidateId, uint256 timestamp, uint256 blockNumber);
    event ElectionClosed(string electionId, uint256 timestamp, uint256 totalVotes);
    
    //modifiers
    modifier onlyDuringElection() {
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime, "Election has not started yet");
        require(election.endTime == 0 || block.timestamp <= election.endTime, "Election has ended");
        _;
    }
    
    //initialize the election function
    function initElection(
        string memory _electionName,
        string memory _electionId,
        string[] memory _candidates,
        uint256 _startTime,
        uint256 _endTime
    ) public {
        require(!election.isActive, "Election already initialized");
        
        election.electionId = _electionId;
        election.electionName = _electionName;
        election.startTime = _startTime > 0 ? _startTime : block.timestamp;
        election.endTime = _endTime;
        election.isActive = true;
        
        //clear previous election data if there is any
        delete candidates;
        delete votes;
        
        //set new candidates
        for (uint i = 0; i < _candidates.length; i++) {
            candidates.push(_candidates[i]);
        }
    }
    
    //cast a vote
    function castVote(
        string memory _voterHash,
        string memory _candidateId,
        string memory _sessionId
    ) public onlyDuringElection returns (bool) {
        //check if voter has already voted
        bytes32 voterKey = keccak256(abi.encodePacked(_voterHash));
        require(!hasVoted[_voterHash], "Voter has already cast a vote");
        
        //check if candidate is valid
        bool validCandidate = false;
        for (uint i = 0; i < candidates.length; i++) {
            if (keccak256(abi.encodePacked(candidates[i])) == keccak256(abi.encodePacked(_candidateId))) {
                validCandidate = true;
                break;
            }
        }
        require(validCandidate, "Invalid candidate");
        
        //record vote to the contract
        votes.push(Vote({
            voterHash: _voterHash,
            candidateId: _candidateId,
            sessionId: _sessionId,
            timestamp: block.timestamp,
            blockNumber: block.number
        }));
        
        //mark voter as having voted
        hasVoted[_voterHash] = true;
        
        //emit event
        emit VoteCast(_voterHash, _candidateId, block.timestamp, block.number);
        
        return true;
    }
    
    //get election results
    function getResults() public view returns (string[] memory, uint256[] memory, uint256) {
        uint256[] memory results = new uint256[](candidates.length);
        
        //count votes between candidates
        for (uint i = 0; i < votes.length; i++) {
            for (uint j = 0; j < candidates.length; j++) {
                if (keccak256(abi.encodePacked(votes[i].candidateId)) == keccak256(abi.encodePacked(candidates[j]))) {
                    results[j]++;
                    break;
                }
            }
        }
        
        return (candidates, results, votes.length);
    }
    
    //get all votes with pagination
    function getAllVotes(uint256 pageSize, uint256 page) public view returns (
        Vote[] memory,
        uint256,
        bool
    ) {
        uint256 startIndex = page * pageSize;
        uint256 endIndex = startIndex + pageSize;
        
        if (endIndex > votes.length) {
            endIndex = votes.length;
        }
        
        if (startIndex >= votes.length) {
            Vote[] memory emptyArray = new Vote[](0);
            return (emptyArray, votes.length, false);
        }
        
        uint256 resultSize = endIndex - startIndex;
        Vote[] memory result = new Vote[](resultSize);
        
        for (uint i = 0; i < resultSize; i++) {
            result[i] = votes[startIndex + i];
        }
        
        bool hasMore = endIndex < votes.length;
        
        return (result, votes.length, hasMore);
    }
    
    //close the election
    function closeElection() public returns (bool) {
        require(election.isActive, "Election is already closed");
        
        election.isActive = false;
        election.endTime = block.timestamp;
        
        emit ElectionClosed(election.electionId, block.timestamp, votes.length);
        
        return true;
    }
    
    //verify chain state of the blockchain
    function verifyState() public view returns (
        bool,
        uint256,
        uint256
    ) {
        return (
            election.isActive,
            block.number,
            votes.length
        );
    }
} 