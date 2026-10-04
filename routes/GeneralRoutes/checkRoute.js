import express from "express";
// import ensureImageBuild, { images } from "../../docker/engine/engine.js";
import executePython from "../../docker/engine/execution.js";


const r = express.Router();

r.get("/",async (req,res)=>{
   const data = await executePython("for i in range(101000): print(i)")
    res.json({"msg":data})
})




export default r;