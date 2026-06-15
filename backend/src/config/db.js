import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/url_shortener';

// Auto-create database helper
async function ensureDatabaseExists() {
  const urlObj = new URL(dbUrl);
  const dbName = urlObj.pathname.slice(1);
  
  // Create a connection URL pointing to default 'postgres' database
  const defaultUrl = `${urlObj.protocol}//${urlObj.username}:${urlObj.password}@${urlObj.host}/postgres`;
  
  const client = new pg.Client({
    connectionString: defaultUrl,
  });

  try {
    await client.connect();
    // Check if database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Creating...`);
      // CREATE DATABASE cannot run inside a transaction block or with parameterized query
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully!`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (error) {
    console.error('Error ensuring database exists:', error.message);
    console.log('Continuing connection attempt (relying on pre-existing database)...');
  } finally {
    await client.end().catch(() => {});
  }
}

// Ensure database is created before Sequelize initializes
await ensureDatabaseExists();

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false, // Set to console.log to debug SQL queries
  dialectOptions: {
    // Optional: add ssl configuration if needed for production deployments
  }
});

export default sequelize;
export { sequelize };
