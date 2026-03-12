const express = require('express');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/outlets';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'outlet-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get all outlets with pagination, search, and filters
router.get('/',  async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const isActive = req.query.isActive;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      deletedAt: false,
      ...(search && {
        OR: [
          { name: { contains: search } },
          { address: { contains: search } },
          { mobile: { contains: search } }
        ]
      }),
      ...(isActive !== undefined && isActive !== '' && {
        isActive: isActive === 'true'
      })
    };

    // Get total count
    const totalCount = await prisma.outlets.count({ where });

    // Get outlets
    const outlets = await prisma.outlets.findMany({
      where,
      orderBy: {
        [sortBy]: sortDir
      },
      skip,
      take: limit
    });

    res.json({
      outlets,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount
    });
  } catch (error) {
    console.error('Error fetching outlets:', error);
    res.status(500).json({ error: 'Failed to fetch outlets' });
  }
});

// Get single outlet by ID
router.get('/:id',  async (req, res) => {
  try {
    const { id } = req.params;

    const outlet = await prisma.outlets.findFirst({
      where: {
        id: parseInt(id),
        deletedAt: false
      }
    });

    if (!outlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    res.json(outlet);
  } catch (error) {
    console.error('Error fetching outlet:', error);
    res.status(500).json({ error: 'Failed to fetch outlet' });
  }
});

// Create new outlet
router.post('/', async (req, res) => {
  try {
    const { name, address, mobile, googleMapLink, image, isActive } = req.body;

    // Validate required fields
    if (!name || !address || !mobile) {
      return res.status(400).json({ error: 'Name, address, and mobile are required' });
    }

    const outlet = await prisma.outlets.create({
      data: {
        name,
        address,
        mobile,
        googleMapLink,
        image,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json(outlet);
  } catch (error) {
    console.error('Error creating outlet:', error);
    res.status(500).json({ error: 'Failed to create outlet' });
  }
});

// Update outlet
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, mobile, googleMapLink, image, isActive } = req.body;

    // Check if outlet exists
    const existingOutlet = await prisma.outlets.findFirst({
      where: {
        id: parseInt(id),
        deletedAt: false
      }
    });

    if (!existingOutlet) {
      return res.status(404).json({ error: 'Outlet not found' });
    }

    // Update outlet
    const outlet = await prisma.outlets.update({
      where: { id: parseInt(id) },
      data: {
        name: name || existingOutlet.name,
        address: address || existingOutlet.address,
        mobile: mobile || existingOutlet.mobile,
        googleMapLink: googleMapLink !== undefined ? googleMapLink : existingOutlet.googleMapLink,
        image: image !== undefined ? image : existingOutlet.image,
        isActive: isActive !== undefined ? isActive : existingOutlet.isActive
      }
    });

    // If image was updated and old image exists, delete it
    if (image && existingOutlet.image && image !== existingOutlet.image) {
      const oldImagePath = path.join(__dirname, '../../', existingOutlet.image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    res.json(outlet);
  } catch (error) {
    console.error('Error updating outlet:', error);
    res.status(500).json({ error: 'Failed to update outlet' });
  }
});

// Delete outlet (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const outlet = await prisma.outlets.update({
      where: { id: parseInt(id) },
      data: {
        deletedAt: true
      }
    });

    res.json({ message: 'Outlet deleted successfully' });
  } catch (error) {
    console.error('Error deleting outlet:', error);
    res.status(500).json({ error: 'Failed to delete outlet' });
  }
});


module.exports = router;