import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true',
  max: 1,  //Set the max connection pool to 1 in order to easily reproduce the bug, but it can obviously be reproduced also with a higher number
});

async function setupDB() {
  try {
    console.log('Setting up database tables...');
    
    await sql`DROP TABLE IF EXISTS table_causing_error`;
    await sql`DROP TABLE IF EXISTS some_other_table`;
    console.log('Dropped existing tables if they existed');
    
    await sql`
      CREATE TABLE table_causing_error (
        name TEXT,
        age INTEGER
      )
    `;
    console.log('Created table_causing_error');
    
    await sql`
      INSERT INTO table_causing_error (name, age) VALUES
        ('Alice', 25),
        ('Bob', 30),
        ('Charlie', 0)
    `;
    console.log('Inserted 3 rows into table_causing_error');
    
    await sql`
      CREATE TABLE some_other_table (
        title TEXT,
        amount INTEGER
      )
    `;
    console.log('Created some_other_table');
    
    // Insert five rows into some_other_table
    await sql`
      INSERT INTO some_other_table (title, amount) VALUES
        ('Product A', 100),
        ('Product B', 250),
        ('Product C', 75),
        ('Product D', 300),
        ('Product E', 150)
    `;
    console.log('Inserted 5 rows into some_other_table');
    
    console.log('Database setup completed successfully!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    // Test the connection
    const result = await sql`SELECT version()`;
    console.log('Database version:', result[0].version);
    
    // Setup database tables and data
    await setupDB();

    const someOtherTableDataBeforeError = await sql`SELECT * FROM some_other_table`;
    console.log('Number of items in some_other_table:', someOtherTableDataBeforeError.length);
    
    //create a query that will cause an error on the third row
    try {
        const tableCausingErrorData = await sql`SELECT * FROM table_causing_error WHERE 1000/age > 0`;
        console.log('Data in table_causing_error:', tableCausingErrorData);
    }
    catch(error){
        console.error('Error:', error.message);
    }
    
    
    const someOtherTableDataAfterError = await sql`SELECT * FROM some_other_table`;
    console.log('Number of items in some_other_table AFTER ERROR:', someOtherTableDataAfterError.length);
    console.log('Data in some_other_table:', someOtherTableDataAfterError);
  } finally {
    // Close the connection
    await sql.end();
    console.log('Database connection closed.');
  }
}

// Run the main function
main().catch(console.error);
