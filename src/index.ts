import express from 'express';
import Database from 'better-sqlite3';
import sha256 from 'sha256';
import * as dotenv from "dotenv";


dotenv.config();
const db = new Database('/tmp/database.db')
const app = express();
app.use(express.json());


const port = process.env['PORT'] || 9000; // def port

const mempool: { txHash: string; body: string }[] = [];
// latest blockHeight 
let blockNo = Number(getBlockHeight()) + 1;

function insertTransactionToDB(txString: string, blockNo: number) {
  const tx = JSON.parse(txString);

  const insertTXs = db.prepare('INSERT INTO txlTransactions VALUES (?,?,?,?)')
  insertTXs.run(tx.from, tx.to, tx.amount, sha256(txString))
  
  const insertBlock = db.prepare('INSERT INTO txlBlocks VALUES (?,?)')
  insertBlock.run(blockNo, sha256(txString));
  
}

function getBlockTransactions(blockNo: number) { 
  const txhashes = db.prepare('SELECT txHash FROM txlBlocks where blockNo = ?').all(blockNo);
  const result = Object.values(txhashes).map((result) => result.txHash)

  return result

}
function getBlockHeight() { 
  const blockHeight = db.prepare('SELECT MAX(blockNo) FROM txlBlocks').get();
  return Object.values(blockHeight)[0];

}

function getBlockNoForTX(txhash: string) { 
  const blockNo = db.prepare('SELECT blockNo FROM txlBlocks WHERE txHash = ?').get(txhash);
  return Object.values(blockNo)[0];
}

// txlBlocks (blockNo INTEGER, txHash TEXT 
// txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txhash TEXT)

function getAllTXsFromDB(address: string) {
  const result = db.prepare('SELECT txHash FROM txlTransactions WHERE sender = ? OR receiver = ?').all(address, address);
  
  return (result );
  
}


function getAllReceiverAmountsFromDB(receiver: string) {
  const result = db.prepare('SELECT amount FROM txlTransactions WHERE receiver = ?').all(receiver);

  return (result ? Object.values(result).map((result) => result.amount) : []) as number[];
  
}

function getAllSenderAmountsFromDB(receiver: string) {
  const result = db.prepare('SELECT amount FROM txlTransactions WHERE sender = ?').all(receiver);

  return (result ? Object.values(result).map((result) => result.amount) : []) as number[];
  
}

console.log('Hello World');
console.log(`Today's Blocktime will be ${process.env['BLOCK_TIME']} seconds`);

function hasEnoughBalance(sender: string, amount: number) {
  // get all receiver txs
  const receivingTXs = getAllReceiverAmountsFromDB(sender);
  
  // sum amount
  const receivingTotal : number = receivingTXs.length>0 ? receivingTXs.reduce((sum, val) => sum + val) : 0;
  
  // get all sender txs
  const sendingTXs = getAllSenderAmountsFromDB(sender);
  
  // sum amount
  const sendingTotal: number = sendingTXs.length>0 ? sendingTXs.reduce((sum, val) => sum + val) : 0;
  
  // check if balance is higher than amount to be sent
  if (Number(receivingTotal) >= (Number(sendingTotal) +Number(amount))) {
    return true;
  }

  return false;
}
function checkValidTransaction(txJson: string) { 
  const tx = JSON.parse(txJson);
  if (Object.prototype.hasOwnProperty.call(tx, "from") && Object.prototype.hasOwnProperty.call(tx, "to") && Object.prototype.hasOwnProperty.call(tx, "amount") ) { 
    return true;
  }
  return false;
}

/**
 * returns transactions, as list which have been saved to blockchain
*/
app.get("/address/:addr",  (req, res) => {
  // get all tx where address is sender or receiver, as well as their block height and hash
  const address = req.params.addr; 
  const receivingTXs =  getAllReceiverAmountsFromDB(address);
  const sendingTXs = getAllSenderAmountsFromDB(address);
  
  // get blockNos for each
  const receivingTotal: number = receivingTXs.length > 0 ? receivingTXs.reduce((sum, val) => sum + val) : 0;
  const sendingTotal : number = sendingTXs.length>0 ? sendingTXs.reduce((sum, val) => sum + val) : 0;
  const balance = receivingTotal - sendingTotal;

  const txsNoBlock = getAllTXsFromDB(address);
  const txsWithBlock = txsNoBlock.map((tx) => {
    const blockNo = getBlockNoForTX(tx.txHash);
    return {blockNo: blockNo, txHash: tx.txHash}
  });

  // return reponse
  const response = {balance: balance, transactions: txsWithBlock}
    res.send(response);
});

/**
 * takes transcations from body and retuns a sha256 hash if added to pool
*/
app.post("/transaction", async (req, res) => {
  // check for valid transaction
  const body = req.body;
  if (checkValidTransaction(JSON.stringify(body))) {

    // check balance of sender or for genesis user
    if (hasEnoughBalance(body.from, body.amount) || body.from.toLowerCase() == 'genesis') {
      // sender has enough funds to send

      // put transaction into mempool
      mempool.push({...body, txHash: sha256(JSON.stringify(body))});
      
      // return hash as reponse
      res.status(200).send(sha256(JSON.stringify(body)));

    } else {
      // not enough balance
      res.status(400).send("not enough funds");
    }

  } else {
  
    res.status(400).send("check your transaction format");
  }
});

setInterval(() => {
  // let's create a new block
  console.log(`Creating block ${blockNo} now with ${mempool.length} txs`);
  mempool.map((tx) => { insertTransactionToDB(JSON.stringify(tx), blockNo) });

  // Log block
  const block = { blockNo: blockNo, txs: getBlockTransactions(blockNo) }
  console.log(`Please welcome Block No. ${blockNo}`);
  console.log(block);

  // increment blockheight and clear mempool
  blockNo++;
  mempool.splice(0, mempool.length);

},Number(process.env['BLOCK_TIME'])*1000);


// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );