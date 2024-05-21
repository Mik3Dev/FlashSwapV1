// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StoreValue.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Arbitrator is StoreValue {
    constructor(address initialAddress) StoreValue(initialAddress) {}

    function swapTokens(
        address router,
        address tokenIn,
        address tokenOut,
        uint amountIn,
        uint amountOutMin,
        uint deadline
    ) private {
        IUniswapV2Router02 uniswapRouter = IUniswapV2Router02(router);
        require(
            IERC20(tokenIn).balanceOf(address(this)) >= amountIn,
            "Not enough tokens in contract"
        );

        IERC20(tokenIn).approve(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uniswapRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
    }

    function executeArbitrage(
        address[] memory router,
        address[] memory swaps,
        address[] memory tokens,
        uint[] memory amounts,
        uint[] memory deadlines
    ) public onlyOwner {
        for (uint256 index = 0; index < swaps.length; index++) {
            swapTokens(
                router[index],
                tokens[index],
                tokens[index + 1],
                amounts[index],
                amounts[index + 1],
                deadlines[index]
            );
        }
    }
}
