/* Augmint's internal Exchange
    TODO: check/test if underflow possible on sell/buyORder.amount -= token/weiAmount in matchOrders()
    TODO: use a lib for orders?
    TODO: use generic new order and remove order events?
    TODO: handle potential issues with cancelOrder because of using array idx as id
    TODO: deduct fee
    TODO: minOrderAmount setter
    TODO: index event args
*/
pragma solidity 0.4.18;
import "./interfaces/ExchangeOrderedInterface.sol";


contract ExchangeOrdered is ExchangeOrderedInterface {
    uint public constant ORDER_FILL_WORST_GAS = 300000;
    uint public minOrderAmount;

    event NewSellEthOrder(uint sellEthOrderId, address maker, int price, uint weiAmount);
    event NewBuyEthOrder(uint buyEthOrderId, address maker, int price, uint tokenAmount);

    event OrderFill(address seller, address buyer, uint buyEthOrderId, uint sellEthOrderId, int price,
        uint weiAmount, uint tokenAmount);

    event CancelledSellEthOrder(address maker, uint weiAmount);
    event CancelledBuyEthOrder(address maker, uint tokenAmount);

    function ExchangeOrdered(address augmintTokenAddress, address ratesAddress, uint _minOrderAmount) public {
        augmintToken = AugmintTokenInterface(augmintTokenAddress);
        rates = Rates(ratesAddress);
        minOrderAmount = _minOrderAmount;
    }

    function placeSellEthOrder(int price) external payable returns (uint sellEthOrderId) {
        require(price > 0);
        uint tokenAmount = rates.convertFromWei(augmintToken.peggedSymbol(), msg.value);
        require(tokenAmount >= minOrderAmount);
        OrderHeap.Order memory order = OrderHeap.Order(msg.sender, now, -price, msg.value);
        sellEthOrderId = sellEthOrders.insert(order);

        NewSellEthOrder(sellEthOrderId, msg.sender, price, msg.value);
    }

    /* this function requires previous approval to transfer tokens */
    function placeBuyEthOrder(int price, uint tokenAmount) external returns (uint buyEthOrderId) {
        augmintToken.transferFromNoFee(msg.sender, this, tokenAmount, "Sell token order placed");
        return _placeBuyEthOrder(msg.sender, price, tokenAmount);
    }

    /* This func assuming that token already transferred to Exchange so it can be only called
        via AugmintToken.placeBuyEthOrderOnExchange() convenience function */
    function placeBuyEthOrderTrusted(address maker, uint _price, uint tokenAmount)
    external returns (uint buyEthOrderId) {
        require(msg.sender == address(augmintToken));
        int price = int(_price); // can be removed if we modify price arg to int on interface
        require(uint(price) == _price);
        return _placeBuyEthOrder(maker, price, tokenAmount);
    }

    function cancelSellEthOrder(uint sellEthOrderId) external {
        require(sellEthOrders[sellEthOrderId].maker == msg.sender);
        uint amount = sellEthOrders[sellEthOrderId].amount;
        sellEthOrders.deletePos(sellEthOrderId);
        CancelledSellEthOrder(msg.sender, amount);
    }

    function cancelBuyEthOrder(uint buyEthOrderId) external {
        require(buyEthOrders[buyEthOrderId].maker == msg.sender);
        uint amount = buyEthOrders[buyEthOrderId].amount;
        buyEthOrders.deletePos(buyEthOrderId);
        CancelledBuyEthOrder(msg.sender, amount);
    }

    function matchOrders() external {
        if (hasOrderToFill()) {
            _fillOrder();
        }
    }

    function matchMultipleOrders() external {
        while (hasOrderToFill() && msg.gas > ORDER_FILL_WORST_GAS) {
            _fillOrder();
        }
    }

    function getOrderCounts() external view returns(uint sellEthOrderCount, uint buyEthOrderCount) {
        return(sellEthOrders.length, buyEthOrders.length);
    }

    function hasOrderToFill() public view returns(bool _hasOrderToFill) {
        return (buyEthOrders.length > 0 && sellEthOrders.length > 0
                && buyEthOrders[0].price >= -sellEthOrders[0].price);
    }

    // return the price which is closer to par
    function getMatchPrice(int sellPrice, int buyPrice) internal pure returns(int price) {
        int sellPriceDeviationFromPar = sellPrice > 1 ? sellPrice - 1 : 1 - sellPrice;
        int buyPriceDeviationFromPar = buyPrice > 1 ? buyPrice - 1 : 1 - buyPrice;
        return price = sellPriceDeviationFromPar > buyPriceDeviationFromPar ?
            buyPrice : sellPrice;
    }

    function _placeBuyEthOrder(address maker, int price, uint tokenAmount) private returns (uint buyEthOrderId) {
        require(price > 0);
        require(tokenAmount >= minOrderAmount);
        OrderHeap.Order memory order = OrderHeap.Order(maker, now, price, tokenAmount);
        buyEthOrderId = buyEthOrders.insert(order);

        NewBuyEthOrder(buyEthOrderId, maker, price, tokenAmount);
    }

    function _fillOrder() private {
        require(-sellEthOrders[0].price <= buyEthOrders[0].price);
        address buyer = buyEthOrders[0].maker;
        address seller = sellEthOrders[0].maker;
        uint128 price = uint128(getMatchPrice(-sellEthOrders[0].price, buyEthOrders[0].price));
        uint buyEthWeiAmount = rates.convertToWei(augmintToken.peggedSymbol(), buyEthOrders[0].amount)
            .mul(price).div(10000);
        uint tradedWeiAmount;
        uint tradedTokenAmount;
        if (buyEthWeiAmount <= sellEthOrders[0].amount) {
            // fully filled buy order
            tradedWeiAmount = buyEthWeiAmount;

            if (buyEthWeiAmount == sellEthOrders[0].amount) {
                // sell order fully filled as well
                tradedTokenAmount = sellEthOrders[0].amount;
                sellEthOrders.deletePos(0);
            } else {
                // sell order only partially filled
                tradedTokenAmount = buyEthOrders[0].amount;
                sellEthOrders[0].amount -= tradedWeiAmount;
            }
            buyEthOrders.deletePos(0);
        } else {
            // partially filled buy order + fully filled sell order
            tradedWeiAmount = sellEthOrders[0].amount;
            tradedTokenAmount = rates.convertFromWei(augmintToken.peggedSymbol(), sellEthOrders[0].amount)
                .mul(price).div(10000);
            buyEthOrders[0].amount -= tradedTokenAmount;
            sellEthOrders.deletePos(0);
        }

        buyer.transfer(tradedWeiAmount);
        augmintToken.transferNoFee(seller, tradedTokenAmount, "Buy token order fill");

        OrderFill(seller, buyer, 0, 0, price, tradedWeiAmount, tradedTokenAmount);

    }

}
