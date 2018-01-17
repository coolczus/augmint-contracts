/* Maintains order in a heap if using insert() and deletePos functions.
Array is not ordered just the first item in the array is always the best order.
If orders have the same price then the older order takes precedence.
Price is negated for sell orders so the same ordering applies to both sell and buy orders.

TODO: Reverse the heap, i.e. make best order the last to save gas in real life use.
    It's more likely that someone will place an order closer to the best and storing best on [0] would require
    bubbling the new order all the way up. Bubbling up requires an SSTORE for each move and SSTORE is expensive.
TODO: shall we use uint32 for time? enough to store unix epoch b/w year 1970 and 2106 (introducing year 2106 problem :)
TODO: shall we use block.number instead of time?

*/
pragma solidity 0.4.18;


library OrderHeap {

    struct Order {
        address maker;
        uint addedTime;
        int price;
        uint amount; // SELL_ETH: amount in wei BUY_ETH: token amount with 4 decimals
    }

    function gt(Order o1, Order o2) internal pure returns(bool isO1GreaterThanO2) {
        return (o1.price > o2.price ||
                    (o1.price == o2.price && o1.addedTime < o2.addedTime));
    }

    /// @notice Inserts the element `elem` in the heap
    /// @param elem Element to be inserted
    function insert(Order[] storage self, Order elem) internal returns(uint pos) {
        pos = self.push(elem) - 1;

        Order memory copy = self[pos];

        while (pos != 0 && gt(copy, self[pos / 2])) {
            self[pos] = self[pos / 2];
            pos = pos / 2;
        }
        self[pos] = copy;

        return pos;
    }

    /// @notice Deletes the element in the position `pos`
    /// @param pos Position of the element to be deleted
    function deletePos(Order[] storage self, uint pos) internal {
        if (pos < self.length - 1) {
            self[pos] = self[self.length - 1];
            shiftDown(self, pos);
        }
        delete self[self.length - 1];
        self.length--;
    }

    // Move a element down in the tree
    // Used to restore heap condition after last item moved to pos
    // but before deletion of last item
    function shiftDown(Order[] storage self, uint pos) private {
        Order memory copy = self[pos];
        bool isHeap = false;

        uint sibling = pos * 2;
        while (sibling < self.length - 1 && !isHeap) {
            if (sibling != (self.length - 1)
                    && gt(self[sibling + 1], self[sibling])
                )
                sibling++;
            if (gt(self[sibling], copy)) {
                self[pos] = self[sibling];
                pos = sibling;
                sibling = pos * 2;
            } else {
                isHeap = true;
            }
        }
        self[pos] = copy;
    }


}
