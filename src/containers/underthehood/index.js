/* TODO: split panels into components */
import React from 'react'
import { bindActionCreators } from 'redux' // TODO: do we really need this or shall we use the store directly?
import { connect } from 'react-redux'
import { setupWeb3 } from '../../modules/ethBase'
import { fetchUserBalance } from '../../modules/userBalances'
import {refreshRates} from '../../modules/rates'
import {refreshTokenUcd} from '../../modules/tokenUcd'
import {refreshLoanManager} from '../../modules/loanManager'
import { ButtonToolbar, Button, Grid, Row, Col, Panel, Table, PageHeader} from 'react-bootstrap';
import stringifier from 'stringifier'

import store from '../../store' /// for debug

const web3Title = ( <h3>Web3 connection</h3> );
const userAccountTitle = ( <h3>User Account</h3> );
const availableAccountsTitle = ( <h3>Accounts</h3> );
const ratesTitle = ( <h3>Rates contract</h3> );
const tokenUcdTitle = ( <h3>TokenUcd contract</h3> );
const loanManagerTitle = ( <h3>LoanManager contract</h3> );
const productsTitle = ( <h3>Loan Products</h3> );

function AccountList(props) {
    const accounts = props.accounts;
    const listItems = accounts == null ?
            <tr><td>Loading...</td></tr>
        : accounts.map( (number, index) =>
            <tr key={number}><td ><small>[{index}] {number}</small></td></tr>
        );

    return (
        <Table condensed striped>
            <tbody>
                { accounts != null && accounts.length === 0 ?
                    <div><tr><td>No accounts</td></tr></div>
                : listItems
                }
            </tbody>
        </Table>
    );
}

function ObjDump(props) {
    const items = props.items;
    const stringify = stringifier( {maxDepth: 2, indent: '   '});
    const listItems = items ?
        items.map( (item, index) =>
            <tr key={index}>
                <td className="white-space:pre-wrap">
                    <small>[{index}] {stringify(item) }</small>
                </td>
            </tr>
        ) : null;
        return (
            <Table condensed striped>
                <tbody>
                    {listItems}
                </tbody>
            </Table>
        );

}

class underTheHood extends React.Component {

    handleBalanceRefreshClick = e => {
        e.preventDefault()
        this.props.getBalance(this.props.userAccount);
        console.log(store.getState());
        //console.log(this.props.rates)
    }

    handleRatesRefreshClick = e => {
        e.preventDefault()
        this.props.refreshRates();
    }

    handleTokenUcdRefreshClick = e => {
        e.preventDefault()
        this.props.refreshTokenUcd();
    }

    handleLoanManagerRefreshClick = e => {
        e.preventDefault()
        this.props.refreshLoanManager();
    }

    render() {
        return(

            <Grid>
                <Row>
                    <Col>
                        <PageHeader>
                            Under the hood
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col xs={8} md={8}>
                        <Row>
                            <Col xs={6} md={6}>
                                <Panel header={web3Title}>
                                    <p>{this.props.isConnected ? "connected" : "not connected" }</p>
                                    <p>Provider: { this.props.web3Instance ? JSON.stringify(this.props.web3Instance.currentProvider) : "No web3 Instance"}</p>
                                    <p>Internal Connection Id: {this.props.web3ConnectionId}</p>
                                    <Button bsSize="small" onClick={this.props.setupWeb3} >Reconnect web3</Button>
                                </Panel>
                            </Col>
                            <Col xs={6} md={6}>
                                <Panel header={userAccountTitle}>
                                    <p>{this.props.userAccount}</p>
                                    <p>ETH Balance: {this.props.userAccountBal.ethBalance} ETH</p>
                                    <p>UCD Balance: {this.props.userAccountBal.ucdBalance} UCD</p>
                                    <ButtonToolbar>
                                        <Button bsSize="small" onClick={this.handleBalanceRefreshClick} disabled={this.props.isLoading || !this.props.isConnected}>Refresh balance</Button>
                                    </ButtonToolbar>
                                </Panel>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={6} md={6}>
                                <Panel header={ratesTitle}>
                                    <p>USD/WEI: {this.props.usdcWeiRate} </p>
                                    <p>ETH/USD: {this.props.ethUsdRate}</p>
                                    <p>USD/ETH: {this.props.usdEthRate} </p>
                                    <p><small>Contract: { this.props.ratesContract == null ? "No contract" :  this.props.ratesContract.instance.address }</small></p>
                                    <p><small>Owner: { this.props.ratesOwner}</small></p>
                                    <p><small>Balance: { this.props.ratesEthBalance} ETH | { this.props.ratesUcdBalance} UCD</small></p>
                                    <ButtonToolbar>
                                        <Button bsSize="small" onClick={this.handleRatesRefreshClick} disabled={this.props.isLoading || !this.props.isConnected}>Refresh rates</Button>
                                    </ButtonToolbar>
                                </Panel>
                            </Col>
                            <Col xs={6} md={6}>
                                <Panel header={tokenUcdTitle}>
                                    <p>Total token supply: {this.props.tokenUcdTotalSupply} UCD</p>
                                    <p>ETH Reserve: {this.props.tokenUcdEthBalance} ETH</p>
                                    <p>UCD Reserve: {this.props.tokenUcdUcdBalance} UCD </p>
                                    <p><small>Contract: { this.props.tokenUcdContract == null ? "No contract" :  this.props.tokenUcdContract.instance.address }</small></p>
                                    <p><small>Owner: { this.props.tokenUcdOwner}</small></p>
                                    <p><small>Decimals: {this.props.tokenUcdDecimals} (Decimals divider: {this.props.tokenUcdDecimalsDiv})</small></p>
                                    <p><small>LoanManager: { this.props.tokenUcdLoanManagerAddress == null ? "No contract" :  this.props.tokenUcdLoanManagerAddress }</small></p>
                                    <ButtonToolbar>
                                        <Button bsSize="small" onClick={this.handleTokenUcdRefreshClick} disabled={this.props.isLoading || !this.props.isConnected}>Refresh info</Button>
                                    </ButtonToolbar>
                                </Panel>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={6} md={6}>
                                <Panel header={loanManagerTitle}>
                                    <p>ProductCount: {this.props.productCount} </p>
                                    <p>LoanCount: {this.props.loanCount} </p>
                                    <p><small>Contract: { this.props.loanManagerContract == null ? "No contract" :  this.props.loanManagerContract.instance.address }</small></p>
                                    <p><small>Owner: { this.props.loanManagerOwner}</small></p>
                                    <p><small>Balance: { this.props.loanManagerEthBalance} ETH | { this.props.loanManagerUcdBalance} UCD </small></p>
                                    <p><small>Rates contract: { this.props.loanManagerRatesContractAddress }</small></p>
                                    <p><small>TokenUcd contract: { this.props.loanManagerTokenUcdContractAddress }</small></p>
                                    <ButtonToolbar>
                                        <Button bsSize="small" onClick={this.handleLoanManagerRefreshClick} disabled={this.props.isLoading || !this.props.isConnected}>Refresh info</Button>
                                    </ButtonToolbar>
                                </Panel>
                            </Col>
                            <Col xs={6} md={6}>
                                <Panel header={productsTitle}>
                                    <ObjDump items={this.props.loanProducts} />
                                </Panel>
                            </Col>
                        </Row>
                    </Col>

                    <Col xs={4} md={4}>
                        <Panel header={availableAccountsTitle}>
                            <AccountList accounts={this.props.accounts} />
                        </Panel>
                    </Col>

                </Row>
                <Row>
                    <Col xs={6} md={6}>
                        <Panel header={<h3>Loans for userAccount</h3>}>
                            { this.props.loans == null ?
                                <p>Loading...</p>
                                : <ObjDump items={this.props.loans} />
                            }
                        </Panel>
                    </Col>
                </Row>
            </Grid>
        )
    }
}

const mapStateToProps = state => ({
    userAccount: state.ethBase.userAccount,
    accounts: state.ethBase.accounts,
    userAccountBal: state.userBalances.account,
    isLoading: state.ethBase.isLoading,
    isConnected: state.ethBase.isConnected,
    web3ConnectionId: state.ethBase.web3ConnectionId,
    web3Instance: state.ethBase.web3Instance,

    ratesContract: state.rates.contract,
    ratesUcdBalance: state.rates.ucdBalance,
    ratesEthBalance: state.rates.ethBalance,
    ratesOwner: state.rates.owner,
    usdcWeiRate: state.rates.usdcWeiRate,
    usdEthRate: state.rates.usdEthRate,
    ethUsdRate: state.rates.ethUsdRate,

    tokenUcdContract: state.tokenUcd.contract,
    tokenUcdOwner: state.tokenUcd.owner,
    tokenUcdDecimals: state.tokenUcd.decimals,
    tokenUcdDecimalsDiv: state.tokenUcd.decimalsDiv,
    tokenUcdUcdBalance: state.tokenUcd.ucdBalance,
    tokenUcdEthBalance: state.tokenUcd.ethBalance,
    tokenUcdTotalSupply: state.tokenUcd.totalSupply,
    tokenUcdLoanManagerAddress: state.tokenUcd.loanManagerAddress,

    loanManagerContract: state.loanManager.contract,
    loanManagerOwner: state.loanManager.owner,
    loanManagerEthBalance: state.loanManager.ethBalance,
    loanManagerUcdBalance: state.loanManager.ucdBalance,
    loanCount: state.loanManager.loanCount,
    productCount: state.loanManager.productCount,
    loanManagerRatesContractAddress: state.loanManager.ratesAddress,
    loanManagerTokenUcdContractAddress: state.loanManager.tokenUcdAddress,
    loanProducts: state.loanManager.products,

    loans: state.loans.loans

})

const mapDispatchToProps = dispatch => bindActionCreators({
    setupWeb3,
    fetchUserBalance,
    refreshRates,
    refreshTokenUcd,
    refreshLoanManager
}, dispatch)

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(underTheHood)
