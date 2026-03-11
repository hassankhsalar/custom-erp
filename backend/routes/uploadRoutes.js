const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads directories exist
const productUploadDir = 'uploads/products';
const materialUploadDir = 'uploads/materials';
const profileUploadDir = 'uploads/profiles';
const valuedCustomerUploadDir = 'uploads/valued-customers';
const outletUploadDir = 'uploads/outlets';

// Create all directories
[productUploadDir, materialUploadDir, profileUploadDir, valuedCustomerUploadDir, outletUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for products
const productStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for materials
const materialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, materialUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'material-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure storage for valued customer images
const valuedCustomerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, valuedCustomerUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'valued-customer-' + uniqueSuffix + path.extname(file.originalname));
  }
});


// Configure storage for outlet images
const outletStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, outletUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'outlet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Configure upload for products
const uploadProduct = multer({
  storage: productStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Configure upload for materials
const uploadMaterial = multer({
  storage: materialStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Configure upload for profile images
const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Configure upload for valued customer images
const uploadValuedCustomer = multer({
  storage: valuedCustomerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Configure upload for outlet images
const uploadOutlet = multer({
  storage: outletStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload product image
router.post('/product', uploadProduct.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Construct the URL
    const imageUrl = `/uploads/products/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload material image
router.post('/material', uploadMaterial.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/materials/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading material image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload profile image
router.post('/profile', uploadProfile.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading profile image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload valued customer image - FIXED VERSION
router.post('/valued-customer', uploadValuedCustomer.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    // Construct the URL - using consistent format with other endpoints
    const imageUrl = `/uploads/valued-customers/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading valued customer image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get uploaded product image
router.get('/products/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(productUploadDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Get uploaded material image
router.get('/materials/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(materialUploadDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Get uploaded profile image
router.get('/profiles/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(profileUploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Get uploaded valued customer image
router.get('/valued-customers/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(valuedCustomerUploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Add this with your other upload configurations
const bannerUploadDir = 'uploads/banners';

// Ensure directory exists
if (!fs.existsSync(bannerUploadDir)) {
  fs.mkdirSync(bannerUploadDir, { recursive: true });
}

// Configure storage for banner images
const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, bannerUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure upload for banner images
const uploadBanner = multer({
  storage: bannerStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload banner image
router.post('/banner', uploadBanner.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/banners/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading banner image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get uploaded banner image
router.get('/banners/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(bannerUploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

const foodCategoryUploadDir = 'uploads/food-categories';

// Ensure directory exists
if (!fs.existsSync(foodCategoryUploadDir)) {
  fs.mkdirSync(foodCategoryUploadDir, { recursive: true });
}

// Configure storage for food category images
const foodCategoryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, foodCategoryUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'food-category-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure upload for food category images
const uploadFoodCategory = multer({
  storage: foodCategoryStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Upload food category image
router.post('/food-category', uploadFoodCategory.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/food-categories/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading food category image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get uploaded food category image
router.get('/food-categories/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(foodCategoryUploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});

// Upload outlet image
router.post('/outlet', uploadOutlet.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/outlets/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading outlet image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get uploaded outlet image
router.get('/outlets/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outletUploadDir, filename);

  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: 'Image not found' });
  }
});


// REMOVE this line as it's causing duplication:
// router.use('/uploads', express.static('uploads'));

module.exports = router;