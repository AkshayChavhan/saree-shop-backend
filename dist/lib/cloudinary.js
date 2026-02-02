"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadImage = uploadImage;
exports.deleteImage = deleteImage;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
exports.default = cloudinary_1.v2;
async function uploadImage(file, folder = 'products') {
    return new Promise((resolve, reject) => {
        cloudinary_1.v2.uploader.upload_stream({
            folder: `saree-shop/${folder}`,
            resource_type: 'image',
        }, (error, result) => {
            if (error)
                reject(error);
            else
                resolve(result);
        }).end(file);
    });
}
async function deleteImage(publicId) {
    return cloudinary_1.v2.uploader.destroy(publicId);
}
//# sourceMappingURL=cloudinary.js.map