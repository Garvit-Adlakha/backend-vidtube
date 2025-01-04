import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();
// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      throw new Error("Local file path is missing");
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "vidtube",
    });

    console.log("File uploaded on Cloudinary: ", response.url);

    // Once the file is uploaded, delete it from the local server
    await fs.unlink(localFilePath);

    return response;
  } catch (error) {
    console.error("Error uploading file to Cloudinary: ", error.message);

    // Attempt to delete the file only if it exists
    try {
      await fs.unlink(localFilePath);
    } catch (deleteError) {
      console.error("Error deleting local file: ", deleteError.message);
    }

    throw new Error("Failed to upload file to Cloudinary");
  }
};

const deleteFromCloudinary = async (publicId)=>{
        try {
           const result= cloudinary.uploader.destroy(publicId)
        } catch (error) {
            console.log("Error deleting from cloudinary,error");
            return null
        }
}



export { uploadOnCloudinary, deleteFromCloudinary };
