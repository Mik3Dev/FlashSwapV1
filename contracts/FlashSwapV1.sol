// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IFlashLoanRecipient} from "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./DEXRegistry.sol";

import "hardhat/console.sol";

contract FlashSwapV1 is Ownable, IFlashLoanRecipient, DEXRegistry {
    using SafeERC20 for IERC20;

    IVault private constant vault =
        IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

    uint256 private constant MAX_INT =
        115792089237316195423570985008687907853269984665640564039457584007913129639935;

    uint24 public constant POOL_FEE = 3000;

    event ReceivedETH(address indexed sender, uint amount);
    event WithdrawETH(address indexed recipient, uint amount);
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
    event FlashSwapFinished(uint256 profitAmount);

    constructor(address initialAddress) Ownable(initialAddress) {}

    function addDEX(
        string memory _name,
        address _routerAddress,
        address _factoryAddress,
        DEXType _exchangeType
    ) public override onlyOwner {
        DEXRegistry.addDEX(
            _name,
            _routerAddress,
            _factoryAddress,
            _exchangeType
        );
    }

    function removeDEX(string memory _name) public override onlyOwner {
        DEXRegistry.removeDEX(_name);
    }

    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function withdraw(uint256 _amount) public onlyOwner {
        payable(msg.sender).transfer(_amount);
        emit WithdrawETH(msg.sender, _amount);
    }

    function getTokenBalance(address token) public view returns (uint) {
        return IERC20(token).balanceOf(address(this));
    }

    function receiveTokens(address token, uint amount) public {
        require(
            IERC20(token).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        emit ReceivedTokens(msg.sender, token, amount);
    }

    function withdrawTokens(address token, uint amount) public onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit WithdrawnTokens(msg.sender, token, amount);
    }

    function approveTokenIfNeeded(
        address token,
        address spender,
        uint256 amount
    ) internal {
        if (IERC20(token).allowance(address(this), spender) < amount) {
            IERC20(token).approve(spender, amount);
        }
    }

    function placeTrade(
        string memory _exchangeName,
        address _fromToken,
        address _toToken,
        uint256 _amountIn
    ) private returns (uint256) {
        DEXInfo memory _exchange = dexInfo[_exchangeName];
        require(_exchange.router != address(0), "Exchange not registered");

        uint256 deadline = block.timestamp + 1 hours;
        uint256 amountReceived = 0;

        if (_exchange.dexType == DEXType.UNISWAP_V2) {
            address pair = IUniswapV2Factory(_exchange.factory).getPair(
                _fromToken,
                _toToken
            );
            require(pair != address(0), "Pool does not exist");

            IUniswapV2Router02 router = IUniswapV2Router02(_exchange.router);

            address[] memory path = new address[](2);
            path[0] = _fromToken;
            path[1] = _toToken;

            uint256 _amountOut = router.getAmountsOut(_amountIn, path)[1];

            approveTokenIfNeeded(_fromToken, _exchange.router, _amountIn);
            approveTokenIfNeeded(_toToken, _exchange.router, _amountOut);

            amountReceived = router.swapExactTokensForTokens(
                _amountIn,
                _amountOut,
                path,
                address(this),
                deadline
            )[1];
        } else {
            IQuoter quoter = IQuoter(_exchange.factory);
            require(address(quoter) != address(0), "Invalid quoter");

            uint256 _amountOut = quoter.quoteExactInputSingle(
                _fromToken,
                _toToken,
                POOL_FEE,
                _amountIn,
                0
            );

            approveTokenIfNeeded(_fromToken, _exchange.router, _amountIn);
            approveTokenIfNeeded(_toToken, _exchange.router, _amountOut);

            ISwapRouter swapRouter = ISwapRouter(_exchange.router);
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
                .ExactInputSingleParams({
                    tokenIn: _fromToken,
                    tokenOut: _toToken,
                    fee: POOL_FEE,
                    recipient: address(this),
                    deadline: deadline,
                    amountIn: _amountIn,
                    amountOutMinimum: _amountOut,
                    sqrtPriceLimitX96: 0
                });
            amountReceived = swapRouter.exactInputSingle(params);
        }
        // console.log("Received Amount", amountReceived);
        require(amountReceived > 0, "Aborted TX: Trade returned zero");
        return amountReceived;
    }

    function startArbitrage(
        string[] memory _exchangeNames,
        address[] memory _tokens,
        uint256 _amount // amount of token[0] (borrowed amount)
    ) internal returns (uint256) {
        require(_exchangeNames.length >= 2, "Invalid exchange names length");
        require(_tokens.length >= 2, "Invalid tokens address length");
        require(
            _exchangeNames.length == _tokens.length,
            "Mismatch exchange and tokens lengths"
        );
        require(_amount > 0, "Invalid borrowed amount");

        uint256 lastReceivedAmount;

        for (uint256 i = 0; i < _exchangeNames.length; i++) {
            if (i == _exchangeNames.length - 1) {
                lastReceivedAmount = placeTrade(
                    _exchangeNames[i],
                    _tokens[i],
                    _tokens[0],
                    lastReceivedAmount
                );
            } else {
                lastReceivedAmount = lastReceivedAmount == 0
                    ? _amount
                    : lastReceivedAmount;
                lastReceivedAmount = placeTrade(
                    _exchangeNames[i],
                    _tokens[i],
                    _tokens[i + 1],
                    lastReceivedAmount
                );
            }
        }

        return lastReceivedAmount;
    }

    function executeflashSwap(
        string[] calldata _exchangeNames,
        address[] calldata _tokens,
        uint256 _amountToBorrow
    ) external onlyOwner {
        require(_exchangeNames.length >= 2, "Invalid exchange names length");
        require(_tokens.length >= 2, "Invalid tokens address length");
        require(_exchangeNames.length == _tokens.length, "Invalid lengths");
        require(_amountToBorrow > 0, "Invalid borrowed amount");

        IERC20 token = IERC20(_tokens[0]);

        bytes memory userData = abi.encode(
            _exchangeNames,
            _tokens,
            _amountToBorrow
        );

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = token;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _amountToBorrow;

        vault.flashLoan(this, tokens, amounts, userData);
    }

    function receiveFlashLoan(
        IERC20[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external override {
        require(msg.sender == address(vault), "Invalid vault address");

        (
            string[] memory _exchangeNames,
            address[] memory _tokens,
            uint256 _amountToBorrow
        ) = abi.decode(userData, (string[], address[], uint256));

        uint256 finalAmount = startArbitrage(
            _exchangeNames,
            _tokens,
            _amountToBorrow
        );
        uint256 amountToRepay = amounts[0] + feeAmounts[0];
        // console.log("Initial Amount", _amountToBorrow);
        // console.log("Amount to repay", amountToRepay);
        // console.log("Final Amount", finalAmount);

        require(finalAmount > amountToRepay, "Arbitrage not profitable");
        uint256 profitAmount = finalAmount - amountToRepay;
        // console.log("Profit", profitAmount);

        tokens[0].transfer(address(owner()), profitAmount);
        tokens[0].transfer(address(vault), amountToRepay);

        emit FlashSwapFinished(profitAmount);
    }
}
