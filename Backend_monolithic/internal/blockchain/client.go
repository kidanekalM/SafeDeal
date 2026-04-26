package blockchain

import (
	"context"
	"log"
	"math/big"
	"os"
	"strconv"
	"strings"

	"backend_monolithic/internal/contracts"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type Client struct {
	Contract  *contracts.Contracts
	Client    *ethclient.Client
	Auth      *bind.TransactOpts
	connected bool
}

func (c *Client) IsConnected() bool {
	return c.connected
}

func NewClient() (*Client, error) {
	url := os.Getenv("ETHEREUM_NODE_URL")
	privateKeyStr := os.Getenv("PRIVATE_KEY")
	chainIDStr := os.Getenv("CHAIN_ID")
	contractAddressStr := os.Getenv("CONTRACT_ADDRESS")

	if url == "" || privateKeyStr == "" || chainIDStr == "" || contractAddressStr == "" {
		log.Println("Blockchain config missing. Running without blockchain anchoring.")
		return &Client{connected: false}, nil
	}

	chainID, err := strconv.ParseInt(chainIDStr, 10, 64)
	if err != nil {
		log.Printf("Invalid CHAIN_ID: %v. Running without blockchain.", err)
		return &Client{connected: false}, nil
	}

	contractAddress := common.HexToAddress(contractAddressStr)

	client, err := ethclient.Dial(url)
	if err != nil {
		log.Printf("Blockchain RPC unavailable: %v. Running without blockchain.", err)
		return &Client{connected: false}, nil
	}

	// Verify connection
	_, err = client.ChainID(context.Background())
	if err != nil {
		log.Printf("Failed to reach Ethereum network: %v. Running without blockchain.", err)
		return &Client{connected: false}, nil
	}

	// Load private key
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyStr, "0x"))
	if err != nil {
		log.Printf("Invalid private key: %v. Running without blockchain.", err)
		return &Client{connected: false}, nil
	}

	// Create transactor
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(chainID))
	if err != nil {
		log.Printf("Failed to create transactor: %v. Running without blockchain.", err)
		return &Client{connected: false}, nil
	}

	// Load contract
	contract, err := contracts.NewContracts(contractAddress, client)
	if err != nil {
		log.Printf("Failed to load contract at %s: %v. Running without blockchain.", contractAddressStr, err)
		return &Client{connected: false}, nil
	}

	return &Client{
		Contract:  contract,
		Auth:      auth,
		Client:    client,
		connected: true,
	}, nil
}

func (c *Client) CreateEscrow(buyer, seller common.Address, amount *big.Int) (*types.Transaction, error) {
	return c.Contract.CreateEscrow(c.Auth, buyer, seller, amount)
}

func (c *Client) ConfirmPayment(id *big.Int) (*types.Transaction, error) {
	return c.Contract.ConfirmPayment(c.Auth, id)
}

func (c *Client) FinalizeEscrow(id *big.Int) (*types.Transaction, error) {
	return c.Contract.FinalizeEscrow(c.Auth, id)
}

func (c *Client) GetEscrow(id *big.Int) (contracts.EscrowRecord, error) {
	return c.Contract.GetEscrow(&bind.CallOpts{Context: context.Background()}, id)
}

func (c *Client) LogMilestoneSubmitted(id *big.Int, milestoneID *big.Int) (*types.Transaction, error) {
	log.Printf("Blockchain: Logging milestone %d submitted for escrow %d", milestoneID, id)
	return c.Contract.LogMilestoneSubmitted(c.Auth, id, milestoneID)
}

func (c *Client) LogMilestoneApproved(id *big.Int, milestoneID *big.Int) (*types.Transaction, error) {
	log.Printf("Blockchain: Logging milestone %d approved for escrow %d", milestoneID, id)
	return c.Contract.LogMilestoneApproved(c.Auth, id, milestoneID)
}

func (c *Client) LogMilestoneRejected(id *big.Int, milestoneID *big.Int) (*types.Transaction, error) {
	log.Printf("Blockchain: Logging milestone %d rejected for escrow %d", milestoneID, id)
	return c.Contract.LogMilestoneRejected(c.Auth, id, milestoneID)
}
