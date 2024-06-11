// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StoreValue {
    using SafeERC20 for IERC20;

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

    constructor() {}

    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function _withdraw(address owner, uint _amount) internal {
        payable(owner).transfer(_amount);
        emit WithdrawnETH(owner, _amount);
    }

    function getTokenBalance(address token) external view returns (uint) {
        return IERC20(token).balanceOf(address(this));
    }

    function receiveTokens(address token, uint amount) external payable {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit ReceivedTokens(msg.sender, token, amount);
    }

    function _withdrawTokens(
        address owner,
        address token,
        uint amount
    ) internal {
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit WithdrawnTokens(owner, token, amount);
    }
}
