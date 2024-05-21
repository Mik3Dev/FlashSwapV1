// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v2-periphery/contracts/UniswapV2Router02.sol";

contract TestUniswapV2Router02 is UniswapV2Router02 {
    uint[] private _amounts = new uint[](2);
    address[] private _path;
    address private _to;
    uint private _deadline;

    constructor(
        address _factory,
        address _WETH
    ) UniswapV2Router02(_factory, _WETH) {}

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        _path = path;
        _to = to;
        _deadline = deadline;

        _amounts[0] = amountIn;
        _amounts[1] = amountOutMin;
        return _amounts;
    }
}
