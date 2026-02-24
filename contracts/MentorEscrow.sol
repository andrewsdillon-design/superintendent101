// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MentorEscrow
 * @notice Holds USDC for ProFieldHub mentor sessions on Base network.
 *         Client deposits → funds held in escrow → on confirm:
 *           95% released to mentor, 5% to platform treasury.
 *         Admin can refund client if session is disputed/cancelled.
 *
 * Deploy on Base mainnet with:
 *   usdc = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 *   treasury = your admin wallet address
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract MentorEscrow {
    IERC20 public immutable usdc;
    address public treasury;
    address public owner;

    uint256 public constant PLATFORM_FEE_BPS = 500; // 5.00%
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct Session {
        address client;
        address mentor;
        uint256 amount;
        uint256 createdAt;
        bool released;
        bool refunded;
    }

    mapping(bytes32 => Session) public sessions;

    event SessionFunded(bytes32 indexed sessionId, address indexed client, address indexed mentor, uint256 amount);
    event SessionReleased(bytes32 indexed sessionId, uint256 mentorAmount, uint256 platformFee);
    event SessionRefunded(bytes32 indexed sessionId, address indexed client, uint256 amount);
    event TreasuryUpdated(address newTreasury);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc, address _treasury) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
        owner = msg.sender;
    }

    /**
     * @notice Client funds a session. Must approve this contract for `amount` USDC first.
     * @param sessionId  Unique bytes32 identifier (keccak256 of booking ID from DB)
     * @param mentor     Mentor's wallet address
     * @param amount     Full USDC amount in 6-decimal units (e.g. 75 USDC = 75_000_000)
     */
    function fundSession(bytes32 sessionId, address mentor, uint256 amount) external {
        require(sessions[sessionId].client == address(0), "Session already exists");
        require(mentor != address(0), "Invalid mentor address");
        require(amount > 0, "Amount must be > 0");

        require(usdc.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        sessions[sessionId] = Session({
            client: msg.sender,
            mentor: mentor,
            amount: amount,
            createdAt: block.timestamp,
            released: false,
            refunded: false
        });

        emit SessionFunded(sessionId, msg.sender, mentor, amount);
    }

    /**
     * @notice Client confirms session complete — releases 95% to mentor, 5% to treasury.
     *         Owner (admin) can also call this to settle.
     */
    function releasePayment(bytes32 sessionId) external {
        Session storage s = sessions[sessionId];
        require(s.client != address(0), "Session not found");
        require(msg.sender == s.client || msg.sender == owner, "Not authorized");
        require(!s.released && !s.refunded, "Already settled");

        s.released = true;

        uint256 fee = (s.amount * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 mentorAmount = s.amount - fee;

        require(usdc.transfer(s.mentor, mentorAmount), "Mentor transfer failed");
        require(usdc.transfer(treasury, fee), "Fee transfer failed");

        emit SessionReleased(sessionId, mentorAmount, fee);
    }

    /**
     * @notice Refund the full amount to client. Owner only (for disputes/cancellations).
     */
    function refundClient(bytes32 sessionId) external onlyOwner {
        Session storage s = sessions[sessionId];
        require(s.client != address(0), "Session not found");
        require(!s.released && !s.refunded, "Already settled");

        s.refunded = true;

        require(usdc.transfer(s.client, s.amount), "Refund transfer failed");

        emit SessionRefunded(sessionId, s.client, s.amount);
    }

    /**
     * @notice Get session details.
     */
    function getSession(bytes32 sessionId) external view returns (Session memory) {
        return sessions[sessionId];
    }

    /**
     * @notice Update treasury wallet address.
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    /**
     * @notice Transfer contract ownership.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Helper: encode a booking ID string to bytes32 session key.
     */
    function encodeSessionId(string calldata bookingId) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(bookingId));
    }
}
