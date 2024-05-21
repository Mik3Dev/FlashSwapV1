// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StoreValue is Ownable {
    event ReceivedETH(address indexed sender, uint amount);
    event WithdrawnETH(address indexed recipient, uint amount);
    event ReceivedTokens(
        address indexed sender,
        address indexed token,
        uint amount
    );
    event WithdrawnTokens(
        address indexed recipient,
        address indexed token,
        uint amount
    );

    constructor(address initialAddress) Ownable(initialAddress) {}

    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
    }

    function getBalance() external view onlyOwner returns (uint) {
        return address(this).balance;
    }

    function withdraw(uint _amount) external onlyOwner {
        payable(msg.sender).transfer(_amount);
        emit WithdrawnETH(owner(), _amount);
    }

    function getTokenBalance(
        address token
    ) external view onlyOwner returns (uint) {
        return IERC20(token).balanceOf(address(this));
    }

    function receiveTokens(address token, uint amount) external {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit ReceivedTokens(msg.sender, token, amount);
    }

    function withdrawTokens(address token, uint amount) external onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit WithdrawnTokens(owner(), token, amount);
    }
}
