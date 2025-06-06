const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { parseJSONBody, sendJSONResponse } = require('../lib/requestUtils');
const sessionManager = require('../lib/sessionManager');

const prisma = new PrismaClient();

/**
 * Register a new user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { username, email, password, fullName, role, initials } = await parseJSONBody(req);

    // Validate required fields
    if (!username || !email || !password || !fullName || !role || !initials) {
      return sendJSONResponse(res, 400, { 
        error: 'Missing required fields: username, email, password, fullName, role, initials' 
      });
    }

    // Validate role
    const validRoles = ['ADMIN', 'PRODUCTION_COORDINATOR', 'PROCUREMENT_SPECIALIST', 'QC_PERSON', 'ASSEMBLER'];
    if (!validRoles.includes(role)) {
      return sendJSONResponse(res, 400, { 
        error: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return sendJSONResponse(res, 409, { 
        error: 'User with this username or email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        role,
        initials
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        initials: true,
        isActive: true,
        createdAt: true
      }
    });

    sendJSONResponse(res, 201, { 
      message: 'User created successfully',
      user 
    });

  } catch (error) {
    console.error('Registration error:', error);
    sendJSONResponse(res, 500, { error: 'Internal server error during registration' });
  }
}

/**
 * Login user
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { username, password } = await parseJSONBody(req);

    // Validate required fields
    if (!username || !password) {
      return sendJSONResponse(res, 400, { 
        error: 'Username and password are required' 
      });
    }

    // Find user (allow login with username or email)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: username }
        ],
        isActive: true
      }
    });

    if (!user) {
      return sendJSONResponse(res, 401, { 
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return sendJSONResponse(res, 401, { 
        error: 'Invalid credentials' 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    sendJSONResponse(res, 200, {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        initials: user.initials
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    sendJSONResponse(res, 500, { error: 'Internal server error during login' });
  }
}

/**
 * Get current user profile
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    // User should be attached by authentication middleware
    if (!req.user) {
      return sendJSONResponse(res, 401, { error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        initials: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return sendJSONResponse(res, 404, { error: 'User not found' });
    }

    sendJSONResponse(res, 200, { user });

  } catch (error) {
    console.error('Get current user error:', error);
    sendJSONResponse(res, 500, { error: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser
};
