const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendJSONResponse } = require('./requestUtils');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to protect routes with JWT authentication
 * Verifies JWT token and attaches user data to req.user
 */
function protectRoute(handler) {
  return async (req, res, ...args) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendJSONResponse(res, 401, { 
          error: 'Access denied. No token provided or invalid format.' 
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (jwtError) {
        return sendJSONResponse(res, 401, { 
          error: 'Invalid or expired token.' 
        });
      }

      // Fetch user from database to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          initials: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return sendJSONResponse(res, 401, { 
          error: 'User not found or account deactivated.' 
        });
      }

      // Attach user data to request object
      req.user = {
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        initials: user.initials
      };

      // Call the original handler
      return await handler(req, res, ...args);

    } catch (error) {
      console.error('Authentication middleware error:', error);
      return sendJSONResponse(res, 500, { 
        error: 'Internal server error during authentication.' 
      });
    }
  };
}

/**
 * Middleware to authorize specific roles
 * Must be used after protectRoute middleware
 */
function authorizeRoles(...allowedRoles) {
  return function(handler) {
    return async (req, res, ...args) => {
      try {
        // Check if user is attached (should be done by protectRoute)
        if (!req.user) {
          return sendJSONResponse(res, 401, { 
            error: 'Authentication required.' 
          });
        }

        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
          return sendJSONResponse(res, 403, { 
            error: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}` 
          });
        }

        // Call the original handler
        return await handler(req, res, ...args);

      } catch (error) {
        console.error('Authorization middleware error:', error);
        return sendJSONResponse(res, 500, { 
          error: 'Internal server error during authorization.' 
        });
      }
    };
  };
}

/**
 * Helper function to combine protectRoute and authorizeRoles
 */
function requireAuth(...allowedRoles) {
  if (allowedRoles.length === 0) {
    // Only authentication required, no role restriction
    return protectRoute;
  } else {
    // Authentication + role authorization required
    return function(handler) {
      return protectRoute(authorizeRoles(...allowedRoles)(handler));
    };
  }
}

module.exports = {
  protectRoute,
  authorizeRoles,
  requireAuth
};
