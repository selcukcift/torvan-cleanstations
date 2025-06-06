const { sendJSONResponse } = require('../lib/requestUtils');

/**
 * Admin-only endpoint for testing authorization
 * GET /api/admin/test
 */
async function adminTest(req, res) {
  try {
    sendJSONResponse(res, 200, {
      message: 'Admin access granted!',
      user: {
        username: req.user.username,
        role: req.user.role,
        fullName: req.user.fullName
      }
    });
  } catch (error) {
    console.error('Admin test error:', error);
    sendJSONResponse(res, 500, { error: 'Internal server error' });
  }
}

/**
 * Production coordinator endpoint for testing authorization
 * GET /api/production/test
 */
async function productionTest(req, res) {
  try {
    sendJSONResponse(res, 200, {
      message: 'Production access granted!',
      user: {
        username: req.user.username,
        role: req.user.role,
        fullName: req.user.fullName
      }
    });
  } catch (error) {
    console.error('Production test error:', error);
    sendJSONResponse(res, 500, { error: 'Internal server error' });
  }
}

module.exports = {
  adminTest,
  productionTest
};
