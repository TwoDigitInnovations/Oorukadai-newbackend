const multer = require('multer');
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDNARY_CLOUD_NAME,
    api_key: process.env.CLOUDNARY_API_KEY,
    api_secret: process.env.CLOUDNARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        const isPDF = file.mimetype === 'application/pdf';
        return {
            folder: "merk_uploads",
            resource_type: isPDF ? 'raw' : 'image',
            format: isPDF ? 'pdf' : 'png',
            public_id: Date.now() + "-" + file.originalname,
        };
    },
});

module.exports = {
    upload: multer({
        storage: storage,
        limits: { 
            fileSize: 10 * 1024 * 1024,     
            fieldSize: 25 * 1024 * 1024,     
            fieldNameSize: 100,             
            fields: 20                     
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
                cb(null, true);
            } else {
                cb(new Error('Only image and PDF files are allowed!'), false);
            }
        }
    }),  
    cloudinary
};