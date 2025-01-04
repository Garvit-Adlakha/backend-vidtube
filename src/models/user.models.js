import mongoose,{ Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
const userSchema=new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
            email:{
                type:String,
                required:true,
                unique:true,
                lowercase:true,
                trim:true
            },
            fullname:{
                type:String,
                required:true,
                trim:true,
                index:true
            },
            avatar:{
                type:String, //cloudinary url
                required:true,
            },
            coverImage:{
                type:String
            },
            watchHistory:[
                {
                    type:Schema.Types.ObjectId,
                    ref:"Video"
                }
            ],
            password:{
                type:String,
                required:[true,"pasword is required"]
            },
            refreshToken:{
                type:String
            }
    },
    {timestamps:true}
)

userSchema.pre("save", async function (next) {
    // Check if the password field has been modified
    if (!this.isModified("password")) return next();

    // Hash the password and assign it back to the field
    //it should await
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
    // Compare the provided password with the hashed password
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (){
    //short lived access token
  return  jwt.sign(
        {
           _id: this._id,
           email:this.email,
           username:this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
}
userSchema.methods.generateRefreshToken = function () {
    try {
        return jwt.sign(
            { _id: this._id },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
        );
    } catch (error) {
        console.error("Error generating refresh token:", error);
        throw new Error("Could not generate refresh token");
    }
};

export const User=mongoose.model("User",userSchema)