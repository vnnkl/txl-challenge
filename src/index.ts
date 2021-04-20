import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'
import sha256 from 'sha256';
import * as dotenv from "dotenv";
import bodyParser from 'body-parser';

dotenv.config();
sqlite3.verbose();

const app = express();
app.use(express.json());

interface Transaction { 
  from: string,
  to: string,
  amount: number
}

const port = process.env['PORT'] || 9000; // def port

const mempool = [];

function insertTransactionToDB(txString: string, blockNo: number) { 
open(
  '/tmp/database.db',
  ).then(async (db) => {

    const tx = JSON.parse(txString);

    try {
      
      // txlBlocks (blockNo INTEGER, txHash TEXT 
      // txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txhash TEXT)

      await db.exec(`INSERT INTO txlTransactions VALUES ("${tx.from}", "${tx.to}", "${tx.amount}", "${sha256(txString)}" )`);

    } catch (error) {
        console.log('we did run into an error during database call')
        console.log(error)
    }
   
})
}

function getBlockTransactions(blockNo: number) { 
open(
  '/tmp/database.db',
  ).then(async (db) => {


    try {
      
      // txlBlocks (blockNo INTEGER, txHash TEXT 
      // txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txhash TEXT)
      const getAllTxs = await db.all('SELECT txHash FROM txlBlocks where blockNo = ?', blockNo);
      return getAllTxs;
    } catch (error) {
        console.log('we did run into an error during database call')
        console.log(error)
    }
   
})
}

function getAllReceiverTXs(receiver: string): number[] { 
  open(
    '/tmp/database.db',
  ).then(async (db) => {
    console.log(`Database opened.`)

    try {
      
      const result = await db.get('SELECT amount FROM txlTransactions WHERE receiver = ?', receiver);
      return result as number[];

    } catch (error) {
      console.log('we did run into an error during database call')
      console.log(error)
    }
  });
  return [];
}

function getAllSenderTXs(sender: string): number[] { 
  open(
    '/tmp/database.db',
  ).then(async (db) => {
    console.log(`Database opened.`)

    try {
      
      // txlBlocks (blockNo INTEGER, txHash TEXT 
      // txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txhash TEXT)

      const result = await db.get('SELECT amount FROM txlTransactions WHERE sender = ?', sender);

      return result as number[]

    } catch (error) {
      console.log('we did run into an error during database call')
      console.log(error)
    }
  });
  return [];
}

console.log('Hello World');
console.log(`Today's Blocktime will be ${process.env['BLOCK_TIME']} seconds`);

function hasEnoughBalance(sender: string, amount: number):boolean { 
  // get all receiver txs
  const receivingTXs = getAllReceiverTXs(sender);
  // sum amount
  const receivingTotal = receivingTXs.reduce((sum, val) => sum + val);
  // get all sender txs
  const sendingTXs = getAllSenderTXs(sender);
  // sum amount
  const sendingTotal = sendingTXs.reduce((sum, val) => sum + val);
  
  // check if balance is higher than amount to be sent
  if (receivingTotal>=(sendingTotal+amount)) { 
    return true;
  }

  return false;
}
function checkValidTransaction(txJson: string) { 
  const tx = JSON.parse(txJson);
  if (tx.hasOwnProperty('from') && tx.hasOwnProperty('to') && tx.hasOwnProperty('amount') ) { 
    return true;
  }
  return false;
}

/**
 * returns transactions, as list which have been saved to blockchain
*/
app.get("/address/:addr", (req, res) => {
  // get all tx where address is sender or receiver, as well as their block height and hash
  const address = req.params.addr;
  const receivingTXs = getAllReceiverTXs(address);
  const sendingTXs = getAllSenderTXs(address);
  // get blockNos for each

  // return reponse

    res.send( "Hello world!" );
});

/**
 * takes transcations from body and retuns a sha256 hash if added to pool
*/
app.post( "/transaction", ( req, res ) => {
  // check for valid transaction
  const body = req.body;
  if (checkValidTransaction(JSON.stringify(body))){ 
    console.log('got a valid transaction with following format:');

    // check balance of sender
    if (hasEnoughBalance(body.from, body.amount)) {
      // sender has enough funds to send


      // put transaction into mempool
      mempool.push({txHash: sha256(JSON.stringify(body)), body});

      // return hash as reponse
      console.log('executed a transaction');
      res.status(200).send(sha256(JSON.stringify(body)));

    } else { 
      // not enough balance
      res.status(400).send("not enough funds");
    }

  }
  
  res.status(400).send("check your transaction format");
} );

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );