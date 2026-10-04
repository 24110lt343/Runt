import mongoose from "mongoose";

async function connectDB() {
    try {
        await mongoose.connect(process.env.DB_URL,{
            maxPoolSize:10,
            serverSelectionTimeoutMS:10000
        })

        console.log("DATABASE CONNECTED SUCCESSFULLY");
        
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}


export default connectDB;