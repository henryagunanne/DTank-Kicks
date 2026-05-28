// config/db.js

/*

This file defines the function to connect to the MongoDB database using Mongoose. It reads the connection URI from environment variables and establishes a connection. 
If the connection is successful, it logs the host of the connected database. If there is an error during connection, 
it logs the error message and exits the process.

*/  

const mongoose = require("mongoose");

const connectDB = async () => {
    try { 
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dtank-kicks');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
};
    
module.exports = connectDB;