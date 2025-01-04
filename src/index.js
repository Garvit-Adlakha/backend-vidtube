import { app } from "./app.js"
import dotenv from 'dotenv'
import connectDB from "./db/index.js"

dotenv.config({
    path:"./.env"
})
const port=process.env.PORT || 8001

// connectDB()
// .then(()=>{
//     app.listen(port,()=>{
//         console.log(`Server is runnning on port: ${port}`)
//     })
// })
// .catch((err)=>{
//     console.log("MongoDB connection error", err);
    
// })

const startServer= async()=>{
    try{
        await connectDB()
        app.listen(port,()=>{
            console.log(`Server is running on port: ${port}`); 
        })

    }catch(error){
        console.log("Error while connecting to server", error)
    }
}
startServer()