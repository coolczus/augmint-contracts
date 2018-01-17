const RandomSeed = require("random-seed");
const testHelper = new require("./helpers/testHelper.js");
const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const exchangeTestHelper = require("./helpers/exchangeOrderedTestHelper.js");
const ratesTestHelper = new require("./helpers/ratesTestHelper.js");

const ONEWEI = 1000000000000000000;
const ETH_ROUND = 1000000000000; // 6 decimals places max in ETH

const ETH_SELL = 0;
const ETH_BUY = 1;

const ORDER_COUNT = 10;
const MARKET_WEI_RATE = 5000000; // 1ETH = 500 EUR
const MIN_ORDER_RATE = 9000;
const MAX_ORDER_RATE = 11000;
const MIN_TOKEN = 1000000; // 100 ACE
const MAX_TOKEN = 10000000; // 1,000 ACE
const TEST_ACCS_CT = web3.eth.accounts.length;
const ACC_INIT_ACE = 100000000;

let rates, tokenAce, exchange, peggedSymbol;
const random = new RandomSeed("Have the same test data");

const getOrdersFill = async () => {
    // just the top to yet (no multiple fills)
    let orderCounts = await exchange.getOrderCounts();
    let sellCt = orderCounts[0].toNumber();
    let buyCt = orderCounts[1].toNumber();
    const sellOrder = await exchangeTestHelper.getSellOrder(sellCt - 1);
    const buyOrder = await exchangeTestHelper.getBuyOrder(buyCt - 1);
    return { sellOrder: sellOrder, buyOrder: buyOrder };
};

contract("Exchange ordered load tests", accounts => {
    before(async function() {
        rates = await ratesTestHelper.newRatesMock("EUR", MARKET_WEI_RATE);
        tokenAce = await tokenAceTestHelper.newTokenAceMock();
        peggedSymbol = web3.toAscii(await tokenAce.peggedSymbol());
        await tokenAce.issue(TEST_ACCS_CT * ACC_INIT_ACE);
        for (let i = 0; i < TEST_ACCS_CT; i++) {
            await tokenAce.withdrawTokens(accounts[i], ACC_INIT_ACE);
        }

        exchange = await exchangeTestHelper.newExchangeMock(tokenAce, rates, MIN_TOKEN);
    });

    it("place x buy / sell orders", async function() {
        for (let i = 0; i < ORDER_COUNT; i++) {
            const tokenAmount = Math.round(random.random() * 10000 * (MAX_TOKEN - MIN_TOKEN) / 10000) + MIN_TOKEN;
            const price = Math.floor(random.random() * (MAX_ORDER_RATE - MIN_ORDER_RATE)) + MIN_ORDER_RATE;
            const weiAmount =
                Math.round(tokenAmount * price / 10000 / MARKET_WEI_RATE * ONEWEI / ETH_ROUND) * ETH_ROUND;
            const orderType = random.random() < 0.5 ? ETH_SELL : ETH_BUY;
            const order = {
                amount: orderType === ETH_SELL ? weiAmount : tokenAmount,
                maker: accounts[Math.floor(random.random() * (TEST_ACCS_CT - 1))],
                price: price,
                tokenAmount: tokenAmount,
                weiAmount: weiAmount,
                orderType: orderType
            };
            if (order.orderType === ETH_SELL) {
                const tx = await exchange.placeSellEthOrder(order.price, { value: order.amount, from: order.maker });
                testHelper.logGasUse(this, tx, "SELL order");
            } else {
                const tx = await tokenAce.placeBuyEthOrderOnExchange(exchange.address, order.price, order.amount, {
                    from: order.maker
                });
                testHelper.logGasUse(this, tx, "BUY order");
            }
        }
        //await exchangeTestHelper.printOrderBook(10);
    });

    it("it would fill matching orders", async function() {
        const snapshotId = await testHelper.takeSnapshot();
        //await exchangeTestHelper.printOrderBook(10);
        let hasMatch = await exchange.hasOrderToFill();
        while (hasMatch) {
            const match = await getOrdersFill();
            console.log(
                "MATCH:  Sell price: " + match.sellOrder.price.div(10000).toString(),
                "  Buy price: " + match.buyOrder.price.div(10000).toString(),
                "  Sell amount: " + web3.fromWei(match.sellOrder.amount) + " ETH",
                "  Buy amount: " + match.buyOrder.amount.div(10000).toString() + " ACE"
            );
            const tx = await exchange.matchOrders();
            testHelper.logGasUse(this, tx, "matchOrder");
            hasMatch = await exchange.hasOrderToFill();
        }
        //await exchangeTestHelper.printOrderBook(10);
        await testHelper.revertSnapshot(snapshotId);
    });

    it("it would cancel all orders", async function() {
        const snapshotId = await testHelper.takeSnapshot();
        //await exchangeTestHelper.printOrderBook(10);
        let orderCounts = await exchange.getOrderCounts();
        let sellCt = orderCounts[0].toNumber();
        let buyCt = orderCounts[1].toNumber();
        for (let i = sellCt - 1; i >= 0; i--) {
            const delPos = Math.floor(random.random() * i);
            const maker = (await exchange.sellEthOrders(delPos))[0];
            const tx = await exchange.cancelSellEthOrder(delPos, { from: maker });
            testHelper.logGasUse(this, tx, "cancelSellEthOrder");
        }

        for (let i = buyCt - 1; i >= 0; i--) {
            const delPos = Math.floor(random.random() * i);
            const maker = (await exchange.buyEthOrders(delPos))[0];
            const tx = await exchange.cancelBuyEthOrder(delPos, { from: maker });
            testHelper.logGasUse(this, tx, "cancelBuyEthOrder");
        }

        orderCounts = await exchange.getOrderCounts();
        sellCt = orderCounts[0].toNumber();
        buyCt = orderCounts[1].toNumber();

        //await exchangeTestHelper.printOrderBook(10);
        assert.equal(sellCt, 0);
        assert.equal(buyCt, 0);

        await testHelper.revertSnapshot(snapshotId);
    });
});
