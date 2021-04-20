import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite'

sqlite3.verbose();

const app = express();

const port = 8080; // def port

open(
  '/tmp/database.db',
  ).then(async (db) => {
  // do your thing
    console.log(`%c Database opened.`,'{color: #FF9999}')

    try {
      // await db.exec('CREATE TABLE txl (col TEXT)')
      await db.exec('INSERT INTO txl VALUES ("test")')

      const result = await db.get('SELECT col FROM txl WHERE col = ?', 'test')
      
      console.log('result', result);

      const getAll = await db.all('SELECT col FROM txl')
      console.log('getAll', getAll);

    } catch (error) {
      if (error.errno != 1){ // silence table already created error
        console.log('we did run into an error during database call')
        console.log(error)
        }
    }
   
})


console.log('Hello World');

// define a route handler for the default home page
app.get( "/", ( req, res ) => {
    res.send( "Hello world!" );
} );

// start the Express server
app.listen( port, () => {
    console.log( `server started at http://localhost:${ port }` );
} );