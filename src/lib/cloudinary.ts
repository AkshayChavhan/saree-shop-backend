import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure Cloudinary
 * Only initialized if all credentials are provided
 */
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Check if Cloudinary is enabled
 */
export const isCloudinaryEnabled = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Upload image to Cloudinary
 * @param file Base64 string or URL
 * @param folder Folder path in Cloudinary
 * @returns Upload result with URL
 */
export const uploadImage = async (
  file: string,
  folder: string = 'saree-shop'
): Promise<{ url: string; publicId: string }> => {
  if (!isCloudinaryEnabled) {
    throw new Error('Cloudinary is not configured');
  }

  const result = await cloudinary.uploader.upload(file, {
    folder,
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto:good' },
      { format: 'auto' },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

/**
 * Delete image from Cloudinary
 * @param publicId Public ID of the image
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!isCloudinaryEnabled) {
    throw new Error('Cloudinary is not configured');
  }

  await cloudinary.uploader.destroy(publicId);
};

export { cloudinary };
