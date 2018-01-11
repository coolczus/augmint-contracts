
'use strict';

const Locker = artifacts.require('./Locker.sol');
const TokenAce = artifacts.require('./TokenAce.sol');
const SafeMath = artifacts.require('./SafeMath.sol');
const InterestEarnedAccount = artifacts.require('./InterestEarnedAccount.sol');

module.exports = function(deployer, network) {

    deployer.link(SafeMath, Locker);
    deployer.deploy(Locker, TokenAce.address);

};