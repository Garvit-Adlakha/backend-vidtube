import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { User } from '../models/user.models.js'
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import Jwt from 'jsonwebtoken'
const registerUser = asyncHandler(async (req, res) => {
  //TODO
  const { fullname, email, username, password } = req.body

  //validation
  if (
    [fullname, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist")
  }
  const avatarLocalPath = req.files?.avatar?.[0]?.path
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing")
  }

  // const avatar=await uploadOnCloudinary(avatarLocalPath)
  // let coverImage=""
  // if(coverImageLocalPath){
  // coverImage=await uploadOnCloudinary(coverImageLocalPath)
  // }
  let avatar
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath)
  } catch (error) {
    console.log("error upoloading avatar", error);
    throw new ApiError(500, "Failed to upload avatar")
  }
  let coverImage
  if (coverImageLocalPath) {
    try {
      coverImage = await uploadOnCloudinary(coverImageLocalPath)
    } catch (error) {
      console.log("Error uploading cover image", error)
      throw new ApiError(500, "failed to upload avatar")
    }
  }

  try {
    const user = await User.create({
      fullname,
      username: username.toLowerCase(),
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password
    })
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    ) //extra query it checks database fore created user
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registring a user")
    }
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "user registered successfully"))

  } catch (error) {
    console.log("User Creation failed ")
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id)
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id)
    }
    throw new ApiError("500", "Something wen wrong while registering user and images were deleted")
  }
})

const generateAccessandRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)

    if (!user) {
      throw new ApiError(401, "no user found while generating tokens")
    }
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    throw new ApiError(500, "Something went wronmg while generatin refresh and access token")
  }
}

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body
  if (
    [username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const user = await User.findOne(
    {
      $or: [{ username }, { email }]
    }
  )

  if (!user) {
    throw new ApiError(404, "User not found")
  }

  //validate password

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }
  const { accessToken, refreshToken } = await generateAccessandRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken")

  if (!loggedInUser) {
    throw new ApiError(401, "error while fetching logged in user")
  }
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV || "production"
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200,
      { user: loggedInUser, accessToken, refreshToken },
      "User Logged in succesfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined  //null || ""
      }
    },
    { new: true }
  )
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV || "production"
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incommingRefreshToken) {
    throw new ApiError(401, "Refresh token is required")
  }
  try {
    const decodedToken = Jwt.verify(
      incommingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "invalid refresh token")
    }
    if (incommingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "invalid refresh token or expired")
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV || "production"
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessandRefreshToken(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access token refresh successflly"
      ))
  } catch (error) {
    throw new ApiError(500, "something went wrong while refreshing success token")
  }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body
  const user = await User.findById(req.user?._id)
  const isPasswordValid = await user.isPasswordCorrect(oldPassword)
if(!isPasswordValid){
  throw new ApiError(401,"old password is incorrect")
}
user.password=newPassword
await user.save({validateBeforeSave:false})
return res
.status(200)
.json(new ApiResponse(
  200,
  {},
  "Password changed successfully"
))
})
const getCurrentUser = asyncHandler(async (req, res) => {
 return res
 .status(200)
 .json(new ApiResponse(
  200,
  req.user,
  "current user details fetched successfully"
 ))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullname,email}=req.body
  if(!fullname || !email){
    throw new ApiError(400,"Fullname and email are required")
  }

  const user= await User.findByIdAndUpdate(
    req.user?._id,{
      $set:{
        fullname,
        email:email
      }
    },
    {new:true}
  ).select("-password -refreshToken")

  return res
 .status(200)
 .json(new ApiResponse(
  200,
  user,
  "Account detail updated successfully"
 ))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath= req.files?.path
  if(!avatarLocalPath){
    throw new ApiError(401,"file is required")
  }
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  if(!avatar.url){
    throw new ApiError(500,"Something went wrong while uploading avatar")
  }
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {new:true}
  ).select("-password -refreshToken")

  return res
 .status(200)
 .json(new ApiResponse(
  200,
  avatar.url,
  "Avatar updated successflly"
 ))
})
const updateUserCoverImage=asyncHandler(async (req,res)=>{
 //todo
})
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage
}