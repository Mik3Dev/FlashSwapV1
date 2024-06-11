// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@balancer-labs/v2-interfaces/contracts/vault/IVault.sol";
import {IFlashLoanRecipient} from "@balancer-labs/v2-interfaces/contracts/vault/IFlashLoanRecipient.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FlashSwapUniswapV2 is Ownable, IFlashLoanRecipient {
    using SafeERC20 for IERC20;

    IVault private constant vault =
        IVault(0xBA12222222228d8Ba445958a75a0704d566BF2C8);

    mapping(string => address) public exchangeRouters;
    string[] public exchanges;

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

    function getExchanges() public view returns (string[] memory) {
        return exchanges;
    }

    function addExchangeRouter(
        string memory _name,
        address _routerAddress
    ) public onlyOwner {
        require(
            exchangeRouters[_name] == address(0),
            "Aready registered exchange router"
        );
        exchangeRouters[_name] = _routerAddress;
        exchanges.push(_name);
    }

    function _findExchangeName(
        string memory _name
    ) private view returns (uint, bool) {
        for (uint i = 0; i < exchanges.length; i++) {
            if (
                keccak256(abi.encodePacked(exchanges[i])) ==
                keccak256(abi.encodePacked(_name))
            ) {
                return (i, true);
            }
        }
        return (0, false);
    }

    function _removeExchangeName(string memory _name) private {
        (uint index, bool found) = _findExchangeName(_name);
        require(found, "Element not found");

        for (uint i = index; i < exchanges.length - 1; i++) {
            exchanges[i] = exchanges[i + 1];
        }
        exchanges.pop();
    }

    function removeExchangeRouter(string memory _name) public onlyOwner {
        delete exchangeRouters[_name];
        _removeExchangeName(_name);
    }

    receive() external payable {
        emit ReceivedETH(msg.sender, msg.value);
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function withdraw(uint _amount) public onlyOwner {
        payable(msg.sender).transfer(_amount);
        emit WithdrawnETH(msg.sender, _amount);
    }

    function getTokenBalance(address token) public view returns (uint) {
        return IERC20(token).balanceOf(address(this));
    }

    function receiveTokens(address token, uint amount) external payable {
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

    function swapTokens(
        string memory _exchangeName,
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn,
        uint256 _amountOutMin
    ) private {
        require(
            exchangeRouters[_exchangeName] != address(0),
            "Exchange router not registered"
        );
        IUniswapV2Router02 router = IUniswapV2Router02(
            exchangeRouters[_exchangeName]
        );

        IERC20(_tokenIn).approve(address(router), _amountIn);

        address[] memory path = new address[](2);
        path[0] = _tokenIn;
        path[1] = _tokenOut;

        router.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            path,
            address(this),
            block.timestamp + 1 days
        );
    }

    function executeArbitrage(
        string[] memory _exchanges,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) private {
        require(_exchanges.length == 2, "Exchange list must have length 2");
        require(_tokens.length == 2, "Tokens list must have length 2");
        require(_amounts.length == 3, "Amount list must have length 3");

        swapTokens(
            _exchanges[0],
            _tokens[0],
            _tokens[1],
            _amounts[0],
            _amounts[1]
        );

        swapTokens(
            _exchanges[1],
            _tokens[1],
            _tokens[0],
            _amounts[1],
            _amounts[2]
        );
    }

    function flashSwap(
        address _tokenToLoan,
        uint256 _amountToLoan,
        string[] memory _exchanges,
        address[] memory _tokens,
        uint256[] memory _amounts
    ) external onlyOwner {
        require(_exchanges.length == 2, "Exchange list must have length 2");
        require(_tokens.length == 2, "Tokens list must have length 2");
        require(_amounts.length == 3, "Amount list must have length 3");
        IERC20 token = IERC20(_tokenToLoan);

        bytes memory userData = abi.encode(_exchanges, _tokens, _amounts);

        IERC20[] memory tokens;
        tokens[0] = token;
        uint256[] memory amounts;
        amounts[0] = _amountToLoan;

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
            string[] memory _exchanges,
            address[] memory _tokens,
            uint256[] memory _amounts
        ) = abi.decode(userData, (string[], address[], uint256[]));
        executeArbitrage(_exchanges, _tokens, _amounts);

        uint256 amountToRepay = amounts[0] + feeAmounts[1];
        tokens[0].transfer(address(vault), amountToRepay);
    }
}
