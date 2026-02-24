// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MentorEscrow} from "../src/MentorEscrow.sol";

contract DeployMentorEscrow is Script {
    // Base Sepolia USDC
    address constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    // Base Mainnet USDC
    address constant USDC_MAINNET = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdc = vm.envOr("USE_MAINNET", false) ? USDC_MAINNET : USDC_SEPOLIA;

        console.log("Deploying MentorEscrow...");
        console.log("  USDC:     ", usdc);
        console.log("  Treasury: ", treasury);
        console.log("  Deployer: ", msg.sender);

        vm.startBroadcast();
        MentorEscrow escrow = new MentorEscrow(usdc, treasury);
        vm.stopBroadcast();

        console.log("MentorEscrow deployed at:", address(escrow));
    }
}
