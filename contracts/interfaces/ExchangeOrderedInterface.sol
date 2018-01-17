/* Interface for Augmint's internal Exchange
    TODO: rates setter?
    TODO: make a rates interface and use it instead?
    TODO: uint32 for now?
*/
pragma solidity 0.4.18;
import "../generic/SafeMath.sol";
import "../generic/Restricted.sol";
import "./AugmintTokenInterface.sol";
import "../generic/OrderHeap.sol";
import "../Rates.sol";


contract ExchangeOrderedInterface is Restricted {
    using SafeMath for uint256;
    using OrderHeap for OrderHeap.Order[];
    AugmintTokenInterface public augmintToken;
    Rates public rates;

    OrderHeap.Order[] public sellEthOrders;
    OrderHeap.Order[] public buyEthOrders;
    mapping(address => uint[]) public mSellEthOrders;
    mapping(address => uint[]) public mBuyEthOrders;

    function placeSellEthOrder(int price) external payable returns (uint sellEthOrderId);
    function placeBuyEthOrder(int price, uint tokenAmount) external returns (uint buyEthOrderId);

    function placeBuyEthOrderTrusted(address maker, uint price, uint tokenAmount)
        external returns (uint buyEthOrderIndex);

    function cancelBuyEthOrder(uint buyEthOrderIndex) external;
    function cancelSellEthOrder(uint sellEthOrderIndex) external;
    function matchOrders() external;
    function matchMultipleOrders() external;

}
