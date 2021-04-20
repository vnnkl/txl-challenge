import sqlite3 from 'sqlite3';
import { open } from 'sqlite'

open(
  '/tmp/database.db',
  ).then(async (db) => {  

    try {
      await db.exec('CREATE TABLE IF NOT EXISTS txlBlocks (blockNo INTEGER, txHash TEXT NOT NULL UNIQUE)')
      await db.exec('CREATE TABLE IF NOT EXISTS txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txHash TEXT)')

      console.log(`Database tables have been created.`);
    } catch (error) {
        console.log('we did run into an error during database creation')
        console.log(error)
      
    }
   
})