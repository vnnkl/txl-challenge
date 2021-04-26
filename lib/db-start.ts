import Database from 'better-sqlite3';
const db = new Database('/tmp/database.db')


db.exec('CREATE TABLE IF NOT EXISTS txlBlocks (blockNo INTEGER, txHash TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS txlTransactions (sender TEXT, receiver TEXT, amount INTEGER, txHash TEXT)');

console.log(`Database tables have been created.`);
