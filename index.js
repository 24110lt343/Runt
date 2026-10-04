import express from "express";
import { configDotenv } from "dotenv";
import GeneralRouete from "./routes/GeneralRoutes/checkRoute.js";
import connectDB from "./db/dbConnection.js";
configDotenv();


const app = express();
app.use(express.urlencoded({extended:false}));
app.use("/g",GeneralRouete);


app.get("/",(req,res)=>{
    res.json({
        msg:"Working fine"
    })
})


async function StartServer() {
    await connectDB();
    app.listen(process.env.PORT,()=>{
        console.log(`SERVER IS RUNNING ON PORT : ${process.env.PORT}`);
    })
}

StartServer();

