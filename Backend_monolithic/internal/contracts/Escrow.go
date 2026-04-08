// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// EscrowRecord is an auto generated low-level Go binding around an user-defined struct.
type EscrowRecord struct {
	Buyer  common.Address
	Seller common.Address
	Amount *big.Int
	Status uint8
	Exists bool
}

// ContractsMetaData contains all meta data concerning the Contracts contract.
var ContractsMetaData = &bind.MetaData{
	ABI: "[{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"buyer\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"seller\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"}],\"name\":\"EscrowCreated\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"enumEscrow.Status\",\"name\":\"status\",\"type\":\"uint8\"}],\"name\":\"EscrowFinalized\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"MilestoneApproved\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"MilestoneRejected\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"MilestoneSubmitted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"indexed\":false,\"internalType\":\"enumEscrow.Status\",\"name\":\"status\",\"type\":\"uint8\"}],\"name\":\"PaymentConfirmed\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"}],\"name\":\"confirmPayment\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"buyer\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"seller\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"}],\"name\":\"createEscrow\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"escrows\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"buyer\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"seller\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"},{\"internalType\":\"enumEscrow.Status\",\"name\":\"status\",\"type\":\"uint8\"},{\"internalType\":\"bool\",\"name\":\"exists\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"}],\"name\":\"finalizeEscrow\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"}],\"name\":\"getEscrow\",\"outputs\":[{\"components\":[{\"internalType\":\"address\",\"name\":\"buyer\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"seller\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"},{\"internalType\":\"enumEscrow.Status\",\"name\":\"status\",\"type\":\"uint8\"},{\"internalType\":\"bool\",\"name\":\"exists\",\"type\":\"bool\"}],\"internalType\":\"structEscrow.Record\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"logMilestoneApproved\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"logMilestoneRejected\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"milestoneId\",\"type\":\"uint256\"}],\"name\":\"logMilestoneSubmitted\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"nextId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
	Bin: "0x608060405260018055348015610013575f80fd5b50610f9b806100215f395ff3fe608060405234801561000f575f80fd5b5060043610610091575f3560e01c806361b8ce8c1161006457806361b8ce8c1461011d5780637d19e5961461013b578063876ca09f1461016b578063b43a405a14610187578063c3617650146101a357610091565b8063012f52ee14610095578063132eed04146100c95780633b523135146100e55780634223d94c14610101575b5f80fd5b6100af60048036038101906100aa9190610ae0565b6101d3565b6040516100c0959493929190610be6565b60405180910390f35b6100e360048036038101906100de9190610c37565b61025b565b005b6100ff60048036038101906100fa9190610c37565b6102f7565b005b61011b60048036038101906101169190610c37565b610393565b005b61012561042f565b6040516101329190610c75565b60405180910390f35b61015560048036038101906101509190610ae0565b610435565b6040516101629190610d30565b60405180910390f35b61018560048036038101906101809190610ae0565b6105c7565b005b6101a1600480360381019061019c9190610ae0565b610723565b005b6101bd60048036038101906101b89190610d73565b610880565b6040516101ca9190610c75565b60405180910390f35b5f602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806002015490806003015f9054906101000a900460ff16908060030160019054906101000a900460ff16905085565b5f808381526020019081526020015f2060030160019054906101000a900460ff166102bb576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102b290610e1d565b60405180910390fd5b817f26cf581e2709e0615164af15a371b2dd10fb48d5baed91e9eacd557633c16bcb826040516102eb9190610c75565b60405180910390a25050565b5f808381526020019081526020015f2060030160019054906101000a900460ff16610357576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161034e90610e1d565b60405180910390fd5b817f939da3b627c123c81fe5aacebf925163337a0d4f8a03724640618078cad24894826040516103879190610c75565b60405180910390a25050565b5f808381526020019081526020015f2060030160019054906101000a900460ff166103f3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103ea90610e1d565b60405180910390fd5b817f4e2fd11f84344693b41d2aba9910e33b34a4f02d4d3a65b65b2201f3c8fa3c89826040516104239190610c75565b60405180910390a25050565b60015481565b61043d610a3f565b5f808381526020019081526020015f2060030160019054906101000a900460ff1661049d576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161049490610e1d565b60405180910390fd5b5f808381526020019081526020015f206040518060a00160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001600182015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160028201548152602001600382015f9054906101000a900460ff16600281111561058f5761058e610b59565b5b60028111156105a1576105a0610b59565b5b81526020016003820160019054906101000a900460ff1615151515815250509050919050565b5f808281526020019081526020015f2060030160019054906101000a900460ff16610627576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161061e90610e1d565b60405180910390fd5b5f600281111561063a57610639610b59565b5b5f808381526020019081526020015f206003015f9054906101000a900460ff16600281111561066c5761066b610b59565b5b146106ac576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016106a390610e85565b60405180910390fd5b60015f808381526020019081526020015f206003015f6101000a81548160ff021916908360028111156106e2576106e1610b59565b5b0217905550807f3b0a85ee8d6bba1a181a05a3591e9612fe7bae220ce385bd5f0243dd572e408360016040516107189190610ea3565b60405180910390a250565b5f808281526020019081526020015f2060030160019054906101000a900460ff16610783576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161077a90610e1d565b60405180910390fd5b6001600281111561079757610796610b59565b5b5f808381526020019081526020015f206003015f9054906101000a900460ff1660028111156107c9576107c8610b59565b5b14610809576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161080090610e85565b60405180910390fd5b60025f808381526020019081526020015f206003015f6101000a81548160ff0219169083600281111561083f5761083e610b59565b5b0217905550807f58662431db13314bc9b8be8c45dc7f1cec31ef5b18d41c6a5a76d03389c84ec660026040516108759190610ea3565b60405180910390a250565b5f8060015f81548092919061089490610ee9565b9190505590506040518060a001604052808673ffffffffffffffffffffffffffffffffffffffff1681526020018573ffffffffffffffffffffffffffffffffffffffff1681526020018481526020015f60028111156108f6576108f5610b59565b5b8152602001600115158152505f808381526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506020820151816001015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550604082015181600201556060820151816003015f6101000a81548160ff021916908360028111156109d0576109cf610b59565b5b021790555060808201518160030160016101000a81548160ff021916908315150217905550905050807f9405ad0a6208539879349284d71265479b1623846f70303da1f9890d6e8c10a7868686604051610a2c93929190610f30565b60405180910390a2809150509392505050565b6040518060a001604052805f73ffffffffffffffffffffffffffffffffffffffff1681526020015f73ffffffffffffffffffffffffffffffffffffffff1681526020015f81526020015f6002811115610a9b57610a9a610b59565b5b81526020015f151581525090565b5f80fd5b5f819050919050565b610abf81610aad565b8114610ac9575f80fd5b50565b5f81359050610ada81610ab6565b92915050565b5f60208284031215610af557610af4610aa9565b5b5f610b0284828501610acc565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f610b3482610b0b565b9050919050565b610b4481610b2a565b82525050565b610b5381610aad565b82525050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b60038110610b9757610b96610b59565b5b50565b5f819050610ba782610b86565b919050565b5f610bb682610b9a565b9050919050565b610bc681610bac565b82525050565b5f8115159050919050565b610be081610bcc565b82525050565b5f60a082019050610bf95f830188610b3b565b610c066020830187610b3b565b610c136040830186610b4a565b610c206060830185610bbd565b610c2d6080830184610bd7565b9695505050505050565b5f8060408385031215610c4d57610c4c610aa9565b5b5f610c5a85828601610acc565b9250506020610c6b85828601610acc565b9150509250929050565b5f602082019050610c885f830184610b4a565b92915050565b610c9781610b2a565b82525050565b610ca681610aad565b82525050565b610cb581610bac565b82525050565b610cc481610bcc565b82525050565b60a082015f820151610cde5f850182610c8e565b506020820151610cf16020850182610c8e565b506040820151610d046040850182610c9d565b506060820151610d176060850182610cac565b506080820151610d2a6080850182610cbb565b50505050565b5f60a082019050610d435f830184610cca565b92915050565b610d5281610b2a565b8114610d5c575f80fd5b50565b5f81359050610d6d81610d49565b92915050565b5f805f60608486031215610d8a57610d89610aa9565b5b5f610d9786828701610d5f565b9350506020610da886828701610d5f565b9250506040610db986828701610acc565b9150509250925092565b5f82825260208201905092915050565b7f457363726f7720646f6573206e6f7420657869737400000000000000000000005f82015250565b5f610e07601583610dc3565b9150610e1282610dd3565b602082019050919050565b5f6020820190508181035f830152610e3481610dfb565b9050919050565b7f496e76616c6964207374617475730000000000000000000000000000000000005f82015250565b5f610e6f600e83610dc3565b9150610e7a82610e3b565b602082019050919050565b5f6020820190508181035f830152610e9c81610e63565b9050919050565b5f602082019050610eb65f830184610bbd565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f610ef382610aad565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8203610f2557610f24610ebc565b5b600182019050919050565b5f606082019050610f435f830186610b3b565b610f506020830185610b3b565b610f5d6040830184610b4a565b94935050505056fea26469706673582212200fc84dece2308af57a48685f73ec22a4dcd370bddf53c1a6b71d3e9e9c6c94fa64736f6c63430008140033",
}

// ContractsABI is the input ABI used to generate the binding from.
// Deprecated: Use ContractsMetaData.ABI instead.
var ContractsABI = ContractsMetaData.ABI

// ContractsBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use ContractsMetaData.Bin instead.
var ContractsBin = ContractsMetaData.Bin

// DeployContracts deploys a new Ethereum contract, binding an instance of Contracts to it.
func DeployContracts(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *Contracts, error) {
	parsed, err := ContractsMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(ContractsBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Contracts{ContractsCaller: ContractsCaller{contract: contract}, ContractsTransactor: ContractsTransactor{contract: contract}, ContractsFilterer: ContractsFilterer{contract: contract}}, nil
}

// Contracts is an auto generated Go binding around an Ethereum contract.
type Contracts struct {
	ContractsCaller     // Read-only binding to the contract
	ContractsTransactor // Write-only binding to the contract
	ContractsFilterer   // Log filterer for contract events
}

// ContractsCaller is an auto generated read-only Go binding around an Ethereum contract.
type ContractsCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContractsTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ContractsTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContractsFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ContractsFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ContractsSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type ContractsSession struct {
	Contract     *Contracts        // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// ContractsCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type ContractsCallerSession struct {
	Contract *ContractsCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts    // Call options to use throughout this session
}

// ContractsTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type ContractsTransactorSession struct {
	Contract     *ContractsTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts    // Transaction auth options to use throughout this session
}

// ContractsRaw is an auto generated low-level Go binding around an Ethereum contract.
type ContractsRaw struct {
	Contract *Contracts // Generic contract binding to access the raw methods on
}

// ContractsCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type ContractsCallerRaw struct {
	Contract *ContractsCaller // Generic read-only contract binding to access the raw methods on
}

// ContractsTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type ContractsTransactorRaw struct {
	Contract *ContractsTransactor // Generic write-only contract binding to access the raw methods on
}

// NewContracts creates a new instance of Contracts, bound to a specific deployed contract.
func NewContracts(address common.Address, backend bind.ContractBackend) (*Contracts, error) {
	contract, err := bindContracts(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Contracts{ContractsCaller: ContractsCaller{contract: contract}, ContractsTransactor: ContractsTransactor{contract: contract}, ContractsFilterer: ContractsFilterer{contract: contract}}, nil
}

// NewContractsCaller creates a new read-only instance of Contracts, bound to a specific deployed contract.
func NewContractsCaller(address common.Address, caller bind.ContractCaller) (*ContractsCaller, error) {
	contract, err := bindContracts(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ContractsCaller{contract: contract}, nil
}

// NewContractsTransactor creates a new write-only instance of Contracts, bound to a specific deployed contract.
func NewContractsTransactor(address common.Address, transactor bind.ContractTransactor) (*ContractsTransactor, error) {
	contract, err := bindContracts(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ContractsTransactor{contract: contract}, nil
}

// NewContractsFilterer creates a new log filterer instance of Contracts, bound to a specific deployed contract.
func NewContractsFilterer(address common.Address, filterer bind.ContractFilterer) (*ContractsFilterer, error) {
	contract, err := bindContracts(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ContractsFilterer{contract: contract}, nil
}

// bindContracts binds a generic wrapper to an already deployed contract.
func bindContracts(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := ContractsMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Contracts *ContractsRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Contracts.Contract.ContractsCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Contracts *ContractsRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Contracts.Contract.ContractsTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Contracts *ContractsRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Contracts.Contract.ContractsTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Contracts *ContractsCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Contracts.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Contracts *ContractsTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Contracts.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Contracts *ContractsTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Contracts.Contract.contract.Transact(opts, method, params...)
}

// Escrows is a free data retrieval call binding the contract method 0x012f52ee.
//
// Solidity: function escrows(uint256 ) view returns(address buyer, address seller, uint256 amount, uint8 status, bool exists)
func (_Contracts *ContractsCaller) Escrows(opts *bind.CallOpts, arg0 *big.Int) (struct {
	Buyer  common.Address
	Seller common.Address
	Amount *big.Int
	Status uint8
	Exists bool
}, error) {
	var out []interface{}
	err := _Contracts.contract.Call(opts, &out, "escrows", arg0)

	outstruct := new(struct {
		Buyer  common.Address
		Seller common.Address
		Amount *big.Int
		Status uint8
		Exists bool
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Buyer = *abi.ConvertType(out[0], new(common.Address)).(*common.Address)
	outstruct.Seller = *abi.ConvertType(out[1], new(common.Address)).(*common.Address)
	outstruct.Amount = *abi.ConvertType(out[2], new(*big.Int)).(**big.Int)
	outstruct.Status = *abi.ConvertType(out[3], new(uint8)).(*uint8)
	outstruct.Exists = *abi.ConvertType(out[4], new(bool)).(*bool)

	return *outstruct, err

}

// Escrows is a free data retrieval call binding the contract method 0x012f52ee.
//
// Solidity: function escrows(uint256 ) view returns(address buyer, address seller, uint256 amount, uint8 status, bool exists)
func (_Contracts *ContractsSession) Escrows(arg0 *big.Int) (struct {
	Buyer  common.Address
	Seller common.Address
	Amount *big.Int
	Status uint8
	Exists bool
}, error) {
	return _Contracts.Contract.Escrows(&_Contracts.CallOpts, arg0)
}

// Escrows is a free data retrieval call binding the contract method 0x012f52ee.
//
// Solidity: function escrows(uint256 ) view returns(address buyer, address seller, uint256 amount, uint8 status, bool exists)
func (_Contracts *ContractsCallerSession) Escrows(arg0 *big.Int) (struct {
	Buyer  common.Address
	Seller common.Address
	Amount *big.Int
	Status uint8
	Exists bool
}, error) {
	return _Contracts.Contract.Escrows(&_Contracts.CallOpts, arg0)
}

// GetEscrow is a free data retrieval call binding the contract method 0x7d19e596.
//
// Solidity: function getEscrow(uint256 id) view returns((address,address,uint256,uint8,bool))
func (_Contracts *ContractsCaller) GetEscrow(opts *bind.CallOpts, id *big.Int) (EscrowRecord, error) {
	var out []interface{}
	err := _Contracts.contract.Call(opts, &out, "getEscrow", id)

	if err != nil {
		return *new(EscrowRecord), err
	}

	out0 := *abi.ConvertType(out[0], new(EscrowRecord)).(*EscrowRecord)

	return out0, err

}

// GetEscrow is a free data retrieval call binding the contract method 0x7d19e596.
//
// Solidity: function getEscrow(uint256 id) view returns((address,address,uint256,uint8,bool))
func (_Contracts *ContractsSession) GetEscrow(id *big.Int) (EscrowRecord, error) {
	return _Contracts.Contract.GetEscrow(&_Contracts.CallOpts, id)
}

// GetEscrow is a free data retrieval call binding the contract method 0x7d19e596.
//
// Solidity: function getEscrow(uint256 id) view returns((address,address,uint256,uint8,bool))
func (_Contracts *ContractsCallerSession) GetEscrow(id *big.Int) (EscrowRecord, error) {
	return _Contracts.Contract.GetEscrow(&_Contracts.CallOpts, id)
}

// NextId is a free data retrieval call binding the contract method 0x61b8ce8c.
//
// Solidity: function nextId() view returns(uint256)
func (_Contracts *ContractsCaller) NextId(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Contracts.contract.Call(opts, &out, "nextId")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// NextId is a free data retrieval call binding the contract method 0x61b8ce8c.
//
// Solidity: function nextId() view returns(uint256)
func (_Contracts *ContractsSession) NextId() (*big.Int, error) {
	return _Contracts.Contract.NextId(&_Contracts.CallOpts)
}

// NextId is a free data retrieval call binding the contract method 0x61b8ce8c.
//
// Solidity: function nextId() view returns(uint256)
func (_Contracts *ContractsCallerSession) NextId() (*big.Int, error) {
	return _Contracts.Contract.NextId(&_Contracts.CallOpts)
}

// ConfirmPayment is a paid mutator transaction binding the contract method 0x876ca09f.
//
// Solidity: function confirmPayment(uint256 id) returns()
func (_Contracts *ContractsTransactor) ConfirmPayment(opts *bind.TransactOpts, id *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "confirmPayment", id)
}

// ConfirmPayment is a paid mutator transaction binding the contract method 0x876ca09f.
//
// Solidity: function confirmPayment(uint256 id) returns()
func (_Contracts *ContractsSession) ConfirmPayment(id *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.ConfirmPayment(&_Contracts.TransactOpts, id)
}

// ConfirmPayment is a paid mutator transaction binding the contract method 0x876ca09f.
//
// Solidity: function confirmPayment(uint256 id) returns()
func (_Contracts *ContractsTransactorSession) ConfirmPayment(id *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.ConfirmPayment(&_Contracts.TransactOpts, id)
}

// CreateEscrow is a paid mutator transaction binding the contract method 0xc3617650.
//
// Solidity: function createEscrow(address buyer, address seller, uint256 amount) returns(uint256)
func (_Contracts *ContractsTransactor) CreateEscrow(opts *bind.TransactOpts, buyer common.Address, seller common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "createEscrow", buyer, seller, amount)
}

// CreateEscrow is a paid mutator transaction binding the contract method 0xc3617650.
//
// Solidity: function createEscrow(address buyer, address seller, uint256 amount) returns(uint256)
func (_Contracts *ContractsSession) CreateEscrow(buyer common.Address, seller common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.CreateEscrow(&_Contracts.TransactOpts, buyer, seller, amount)
}

// CreateEscrow is a paid mutator transaction binding the contract method 0xc3617650.
//
// Solidity: function createEscrow(address buyer, address seller, uint256 amount) returns(uint256)
func (_Contracts *ContractsTransactorSession) CreateEscrow(buyer common.Address, seller common.Address, amount *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.CreateEscrow(&_Contracts.TransactOpts, buyer, seller, amount)
}

// FinalizeEscrow is a paid mutator transaction binding the contract method 0xb43a405a.
//
// Solidity: function finalizeEscrow(uint256 id) returns()
func (_Contracts *ContractsTransactor) FinalizeEscrow(opts *bind.TransactOpts, id *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "finalizeEscrow", id)
}

// FinalizeEscrow is a paid mutator transaction binding the contract method 0xb43a405a.
//
// Solidity: function finalizeEscrow(uint256 id) returns()
func (_Contracts *ContractsSession) FinalizeEscrow(id *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.FinalizeEscrow(&_Contracts.TransactOpts, id)
}

// FinalizeEscrow is a paid mutator transaction binding the contract method 0xb43a405a.
//
// Solidity: function finalizeEscrow(uint256 id) returns()
func (_Contracts *ContractsTransactorSession) FinalizeEscrow(id *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.FinalizeEscrow(&_Contracts.TransactOpts, id)
}

// LogMilestoneApproved is a paid mutator transaction binding the contract method 0x3b523135.
//
// Solidity: function logMilestoneApproved(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactor) LogMilestoneApproved(opts *bind.TransactOpts, id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "logMilestoneApproved", id, milestoneId)
}

// LogMilestoneApproved is a paid mutator transaction binding the contract method 0x3b523135.
//
// Solidity: function logMilestoneApproved(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsSession) LogMilestoneApproved(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneApproved(&_Contracts.TransactOpts, id, milestoneId)
}

// LogMilestoneApproved is a paid mutator transaction binding the contract method 0x3b523135.
//
// Solidity: function logMilestoneApproved(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactorSession) LogMilestoneApproved(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneApproved(&_Contracts.TransactOpts, id, milestoneId)
}

// LogMilestoneRejected is a paid mutator transaction binding the contract method 0x4223d94c.
//
// Solidity: function logMilestoneRejected(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactor) LogMilestoneRejected(opts *bind.TransactOpts, id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "logMilestoneRejected", id, milestoneId)
}

// LogMilestoneRejected is a paid mutator transaction binding the contract method 0x4223d94c.
//
// Solidity: function logMilestoneRejected(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsSession) LogMilestoneRejected(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneRejected(&_Contracts.TransactOpts, id, milestoneId)
}

// LogMilestoneRejected is a paid mutator transaction binding the contract method 0x4223d94c.
//
// Solidity: function logMilestoneRejected(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactorSession) LogMilestoneRejected(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneRejected(&_Contracts.TransactOpts, id, milestoneId)
}

// LogMilestoneSubmitted is a paid mutator transaction binding the contract method 0x132eed04.
//
// Solidity: function logMilestoneSubmitted(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactor) LogMilestoneSubmitted(opts *bind.TransactOpts, id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.contract.Transact(opts, "logMilestoneSubmitted", id, milestoneId)
}

// LogMilestoneSubmitted is a paid mutator transaction binding the contract method 0x132eed04.
//
// Solidity: function logMilestoneSubmitted(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsSession) LogMilestoneSubmitted(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneSubmitted(&_Contracts.TransactOpts, id, milestoneId)
}

// LogMilestoneSubmitted is a paid mutator transaction binding the contract method 0x132eed04.
//
// Solidity: function logMilestoneSubmitted(uint256 id, uint256 milestoneId) returns()
func (_Contracts *ContractsTransactorSession) LogMilestoneSubmitted(id *big.Int, milestoneId *big.Int) (*types.Transaction, error) {
	return _Contracts.Contract.LogMilestoneSubmitted(&_Contracts.TransactOpts, id, milestoneId)
}

// ContractsEscrowCreatedIterator is returned from FilterEscrowCreated and is used to iterate over the raw logs and unpacked data for EscrowCreated events raised by the Contracts contract.
type ContractsEscrowCreatedIterator struct {
	Event *ContractsEscrowCreated // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsEscrowCreatedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsEscrowCreated)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsEscrowCreated)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsEscrowCreatedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsEscrowCreatedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsEscrowCreated represents a EscrowCreated event raised by the Contracts contract.
type ContractsEscrowCreated struct {
	Id     *big.Int
	Buyer  common.Address
	Seller common.Address
	Amount *big.Int
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEscrowCreated is a free log retrieval operation binding the contract event 0x9405ad0a6208539879349284d71265479b1623846f70303da1f9890d6e8c10a7.
//
// Solidity: event EscrowCreated(uint256 indexed id, address buyer, address seller, uint256 amount)
func (_Contracts *ContractsFilterer) FilterEscrowCreated(opts *bind.FilterOpts, id []*big.Int) (*ContractsEscrowCreatedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "EscrowCreated", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsEscrowCreatedIterator{contract: _Contracts.contract, event: "EscrowCreated", logs: logs, sub: sub}, nil
}

// WatchEscrowCreated is a free log subscription operation binding the contract event 0x9405ad0a6208539879349284d71265479b1623846f70303da1f9890d6e8c10a7.
//
// Solidity: event EscrowCreated(uint256 indexed id, address buyer, address seller, uint256 amount)
func (_Contracts *ContractsFilterer) WatchEscrowCreated(opts *bind.WatchOpts, sink chan<- *ContractsEscrowCreated, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "EscrowCreated", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsEscrowCreated)
				if err := _Contracts.contract.UnpackLog(event, "EscrowCreated", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseEscrowCreated is a log parse operation binding the contract event 0x9405ad0a6208539879349284d71265479b1623846f70303da1f9890d6e8c10a7.
//
// Solidity: event EscrowCreated(uint256 indexed id, address buyer, address seller, uint256 amount)
func (_Contracts *ContractsFilterer) ParseEscrowCreated(log types.Log) (*ContractsEscrowCreated, error) {
	event := new(ContractsEscrowCreated)
	if err := _Contracts.contract.UnpackLog(event, "EscrowCreated", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ContractsEscrowFinalizedIterator is returned from FilterEscrowFinalized and is used to iterate over the raw logs and unpacked data for EscrowFinalized events raised by the Contracts contract.
type ContractsEscrowFinalizedIterator struct {
	Event *ContractsEscrowFinalized // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsEscrowFinalizedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsEscrowFinalized)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsEscrowFinalized)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsEscrowFinalizedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsEscrowFinalizedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsEscrowFinalized represents a EscrowFinalized event raised by the Contracts contract.
type ContractsEscrowFinalized struct {
	Id     *big.Int
	Status uint8
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEscrowFinalized is a free log retrieval operation binding the contract event 0x58662431db13314bc9b8be8c45dc7f1cec31ef5b18d41c6a5a76d03389c84ec6.
//
// Solidity: event EscrowFinalized(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) FilterEscrowFinalized(opts *bind.FilterOpts, id []*big.Int) (*ContractsEscrowFinalizedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "EscrowFinalized", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsEscrowFinalizedIterator{contract: _Contracts.contract, event: "EscrowFinalized", logs: logs, sub: sub}, nil
}

// WatchEscrowFinalized is a free log subscription operation binding the contract event 0x58662431db13314bc9b8be8c45dc7f1cec31ef5b18d41c6a5a76d03389c84ec6.
//
// Solidity: event EscrowFinalized(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) WatchEscrowFinalized(opts *bind.WatchOpts, sink chan<- *ContractsEscrowFinalized, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "EscrowFinalized", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsEscrowFinalized)
				if err := _Contracts.contract.UnpackLog(event, "EscrowFinalized", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseEscrowFinalized is a log parse operation binding the contract event 0x58662431db13314bc9b8be8c45dc7f1cec31ef5b18d41c6a5a76d03389c84ec6.
//
// Solidity: event EscrowFinalized(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) ParseEscrowFinalized(log types.Log) (*ContractsEscrowFinalized, error) {
	event := new(ContractsEscrowFinalized)
	if err := _Contracts.contract.UnpackLog(event, "EscrowFinalized", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ContractsMilestoneApprovedIterator is returned from FilterMilestoneApproved and is used to iterate over the raw logs and unpacked data for MilestoneApproved events raised by the Contracts contract.
type ContractsMilestoneApprovedIterator struct {
	Event *ContractsMilestoneApproved // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsMilestoneApprovedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsMilestoneApproved)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsMilestoneApproved)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsMilestoneApprovedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsMilestoneApprovedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsMilestoneApproved represents a MilestoneApproved event raised by the Contracts contract.
type ContractsMilestoneApproved struct {
	Id          *big.Int
	MilestoneId *big.Int
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterMilestoneApproved is a free log retrieval operation binding the contract event 0x939da3b627c123c81fe5aacebf925163337a0d4f8a03724640618078cad24894.
//
// Solidity: event MilestoneApproved(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) FilterMilestoneApproved(opts *bind.FilterOpts, id []*big.Int) (*ContractsMilestoneApprovedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "MilestoneApproved", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsMilestoneApprovedIterator{contract: _Contracts.contract, event: "MilestoneApproved", logs: logs, sub: sub}, nil
}

// WatchMilestoneApproved is a free log subscription operation binding the contract event 0x939da3b627c123c81fe5aacebf925163337a0d4f8a03724640618078cad24894.
//
// Solidity: event MilestoneApproved(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) WatchMilestoneApproved(opts *bind.WatchOpts, sink chan<- *ContractsMilestoneApproved, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "MilestoneApproved", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsMilestoneApproved)
				if err := _Contracts.contract.UnpackLog(event, "MilestoneApproved", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseMilestoneApproved is a log parse operation binding the contract event 0x939da3b627c123c81fe5aacebf925163337a0d4f8a03724640618078cad24894.
//
// Solidity: event MilestoneApproved(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) ParseMilestoneApproved(log types.Log) (*ContractsMilestoneApproved, error) {
	event := new(ContractsMilestoneApproved)
	if err := _Contracts.contract.UnpackLog(event, "MilestoneApproved", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ContractsMilestoneRejectedIterator is returned from FilterMilestoneRejected and is used to iterate over the raw logs and unpacked data for MilestoneRejected events raised by the Contracts contract.
type ContractsMilestoneRejectedIterator struct {
	Event *ContractsMilestoneRejected // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsMilestoneRejectedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsMilestoneRejected)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsMilestoneRejected)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsMilestoneRejectedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsMilestoneRejectedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsMilestoneRejected represents a MilestoneRejected event raised by the Contracts contract.
type ContractsMilestoneRejected struct {
	Id          *big.Int
	MilestoneId *big.Int
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterMilestoneRejected is a free log retrieval operation binding the contract event 0x4e2fd11f84344693b41d2aba9910e33b34a4f02d4d3a65b65b2201f3c8fa3c89.
//
// Solidity: event MilestoneRejected(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) FilterMilestoneRejected(opts *bind.FilterOpts, id []*big.Int) (*ContractsMilestoneRejectedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "MilestoneRejected", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsMilestoneRejectedIterator{contract: _Contracts.contract, event: "MilestoneRejected", logs: logs, sub: sub}, nil
}

// WatchMilestoneRejected is a free log subscription operation binding the contract event 0x4e2fd11f84344693b41d2aba9910e33b34a4f02d4d3a65b65b2201f3c8fa3c89.
//
// Solidity: event MilestoneRejected(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) WatchMilestoneRejected(opts *bind.WatchOpts, sink chan<- *ContractsMilestoneRejected, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "MilestoneRejected", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsMilestoneRejected)
				if err := _Contracts.contract.UnpackLog(event, "MilestoneRejected", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseMilestoneRejected is a log parse operation binding the contract event 0x4e2fd11f84344693b41d2aba9910e33b34a4f02d4d3a65b65b2201f3c8fa3c89.
//
// Solidity: event MilestoneRejected(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) ParseMilestoneRejected(log types.Log) (*ContractsMilestoneRejected, error) {
	event := new(ContractsMilestoneRejected)
	if err := _Contracts.contract.UnpackLog(event, "MilestoneRejected", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ContractsMilestoneSubmittedIterator is returned from FilterMilestoneSubmitted and is used to iterate over the raw logs and unpacked data for MilestoneSubmitted events raised by the Contracts contract.
type ContractsMilestoneSubmittedIterator struct {
	Event *ContractsMilestoneSubmitted // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsMilestoneSubmittedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsMilestoneSubmitted)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsMilestoneSubmitted)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsMilestoneSubmittedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsMilestoneSubmittedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsMilestoneSubmitted represents a MilestoneSubmitted event raised by the Contracts contract.
type ContractsMilestoneSubmitted struct {
	Id          *big.Int
	MilestoneId *big.Int
	Raw         types.Log // Blockchain specific contextual infos
}

// FilterMilestoneSubmitted is a free log retrieval operation binding the contract event 0x26cf581e2709e0615164af15a371b2dd10fb48d5baed91e9eacd557633c16bcb.
//
// Solidity: event MilestoneSubmitted(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) FilterMilestoneSubmitted(opts *bind.FilterOpts, id []*big.Int) (*ContractsMilestoneSubmittedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "MilestoneSubmitted", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsMilestoneSubmittedIterator{contract: _Contracts.contract, event: "MilestoneSubmitted", logs: logs, sub: sub}, nil
}

// WatchMilestoneSubmitted is a free log subscription operation binding the contract event 0x26cf581e2709e0615164af15a371b2dd10fb48d5baed91e9eacd557633c16bcb.
//
// Solidity: event MilestoneSubmitted(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) WatchMilestoneSubmitted(opts *bind.WatchOpts, sink chan<- *ContractsMilestoneSubmitted, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "MilestoneSubmitted", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsMilestoneSubmitted)
				if err := _Contracts.contract.UnpackLog(event, "MilestoneSubmitted", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseMilestoneSubmitted is a log parse operation binding the contract event 0x26cf581e2709e0615164af15a371b2dd10fb48d5baed91e9eacd557633c16bcb.
//
// Solidity: event MilestoneSubmitted(uint256 indexed id, uint256 milestoneId)
func (_Contracts *ContractsFilterer) ParseMilestoneSubmitted(log types.Log) (*ContractsMilestoneSubmitted, error) {
	event := new(ContractsMilestoneSubmitted)
	if err := _Contracts.contract.UnpackLog(event, "MilestoneSubmitted", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// ContractsPaymentConfirmedIterator is returned from FilterPaymentConfirmed and is used to iterate over the raw logs and unpacked data for PaymentConfirmed events raised by the Contracts contract.
type ContractsPaymentConfirmedIterator struct {
	Event *ContractsPaymentConfirmed // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *ContractsPaymentConfirmedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(ContractsPaymentConfirmed)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(ContractsPaymentConfirmed)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *ContractsPaymentConfirmedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *ContractsPaymentConfirmedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// ContractsPaymentConfirmed represents a PaymentConfirmed event raised by the Contracts contract.
type ContractsPaymentConfirmed struct {
	Id     *big.Int
	Status uint8
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterPaymentConfirmed is a free log retrieval operation binding the contract event 0x3b0a85ee8d6bba1a181a05a3591e9612fe7bae220ce385bd5f0243dd572e4083.
//
// Solidity: event PaymentConfirmed(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) FilterPaymentConfirmed(opts *bind.FilterOpts, id []*big.Int) (*ContractsPaymentConfirmedIterator, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.FilterLogs(opts, "PaymentConfirmed", idRule)
	if err != nil {
		return nil, err
	}
	return &ContractsPaymentConfirmedIterator{contract: _Contracts.contract, event: "PaymentConfirmed", logs: logs, sub: sub}, nil
}

// WatchPaymentConfirmed is a free log subscription operation binding the contract event 0x3b0a85ee8d6bba1a181a05a3591e9612fe7bae220ce385bd5f0243dd572e4083.
//
// Solidity: event PaymentConfirmed(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) WatchPaymentConfirmed(opts *bind.WatchOpts, sink chan<- *ContractsPaymentConfirmed, id []*big.Int) (event.Subscription, error) {

	var idRule []interface{}
	for _, idItem := range id {
		idRule = append(idRule, idItem)
	}

	logs, sub, err := _Contracts.contract.WatchLogs(opts, "PaymentConfirmed", idRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(ContractsPaymentConfirmed)
				if err := _Contracts.contract.UnpackLog(event, "PaymentConfirmed", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParsePaymentConfirmed is a log parse operation binding the contract event 0x3b0a85ee8d6bba1a181a05a3591e9612fe7bae220ce385bd5f0243dd572e4083.
//
// Solidity: event PaymentConfirmed(uint256 indexed id, uint8 status)
func (_Contracts *ContractsFilterer) ParsePaymentConfirmed(log types.Log) (*ContractsPaymentConfirmed, error) {
	event := new(ContractsPaymentConfirmed)
	if err := _Contracts.contract.UnpackLog(event, "PaymentConfirmed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
