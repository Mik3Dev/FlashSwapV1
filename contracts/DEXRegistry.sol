// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DEXRegistry {
    enum DEXType {
        UNISWAP_V2,
        UNISWAP_V3
    }

    struct DEXInfo {
        address router;
        address factory;
        DEXType dexType;
    }

    mapping(string => DEXInfo) public dexInfo;
    string[] public dexes;

    constructor() {}

    function getDEXs() public view virtual returns (string[] memory) {
        return dexes;
    }

    function addDEX(
        string memory _name,
        address _routerAddress,
        address _factoryAddress,
        DEXType _exchangeType
    ) public virtual {
        require(dexInfo[_name].router == address(0), "Aready registered DEX");
        dexInfo[_name] = DEXInfo({
            router: _routerAddress,
            factory: _factoryAddress,
            dexType: _exchangeType
        });
        dexes.push(_name);
    }

    function _findExchangeName(
        string memory _name
    ) private view returns (uint, bool) {
        for (uint i = 0; i < dexes.length; i++) {
            if (
                keccak256(abi.encodePacked(dexes[i])) ==
                keccak256(abi.encodePacked(_name))
            ) {
                return (i, true);
            }
        }
        return (0, false);
    }

    function _removeExchangeName(string memory _name) private {
        (uint index, bool found) = _findExchangeName(_name);
        require(found, "DEX not registered");

        for (uint i = index; i < dexes.length - 1; i++) {
            dexes[i] = dexes[i + 1];
        }
        dexes.pop();
    }

    function removeDEX(string memory _name) public virtual {
        delete dexInfo[_name];
        _removeExchangeName(_name);
    }
}
