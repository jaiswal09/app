import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import { userRegistrationSchema, userLoginSchema } from '../utils/validators';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const validatedData = userRegistrationSchema.parse(req.body);
    const { email, password, fullName, department, phoneNumber } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user and profile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        }
      });

      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          email,
          fullName,
          role: 'medical_personnel', // Default role
          department,
          phoneNumber,
          isActive: true, // Auto-activate for local setup
        }
      });

      return { user, profile };
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.profile.id,
        email: result.profile.email,
        fullName: result.profile.fullName,
        role: result.profile.role,
        isActive: result.profile.isActive,
      }
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const validatedData = userLoginSchema.parse(req.body);
    const { email, password } = validatedData;

    // Find user with profile
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        profile: true
      }
    });

    if (!user || !user.profile) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.profile.isActive) {
      return res.status(401).json({ error: 'Account is inactive. Please contact administrator.' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.profile.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.profile.id,
        userId: user.id,
        email: user.profile.email,
        fullName: user.profile.fullName,
        role: user.profile.role,
        department: user.profile.department,
        phoneNumber: user.profile.phoneNumber,
        isActive: user.profile.isActive,
      }
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const profile = await prisma.userProfile.findUnique({
      where: { userId: decoded.userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      id: profile.id,
      userId: profile.userId,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      department: profile.department,
      phoneNumber: profile.phoneNumber,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  } catch (error: any) {
    logger.error('Profile fetch error:', error);
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { profile: true }
    });

    if (!user || !user.profile || !user.profile.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new token
    const newToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.profile.role
      },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({ 
      token: newToken,
      user: {
        id: user.profile.id,
        userId: user.id,
        email: user.profile.email,
        fullName: user.profile.fullName,
        role: user.profile.role,
        department: user.profile.department,
        phoneNumber: user.profile.phoneNumber,
        isActive: user.profile.isActive,
      }
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout (for logging purposes)
router.post('/logout', (req, res) => {
  logger.info('User logged out');
  res.json({ message: 'Logout successful' });
});

export default router;