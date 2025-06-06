const url = require('url');
const { getParts, getPartById } = require('../api/partsHandlers');
const { getAssemblies, getAssemblyById } = require('../api/assembliesHandlers');
const { getCategories } = require('../api/categoriesHandlers');
const { handleGenerateBom } = require('../api/bomHandlers.js');
const { register, login, getCurrentUser } = require('../api/authHandlers');
const {
    getSinkModelsHandler,
    getLegTypesHandler,
    getFeetTypesHandler,
    getPegboardOptionsHandler,
    getBasinTypeOptionsHandler,
    getBasinSizeOptionsHandler,
    getBasinAddonOptionsHandler,
    getFaucetTypeOptionsHandler,
    getSprayerTypeOptionsHandler,
    getAccessoryCategoriesHandler,
    getAccessoriesByCategoryHandler,
} = require('../api/configuratorHandlers'); // Added configuratorHandlers
const { adminTest, productionTest } = require('../api/testHandlers');
const { createOrder, getOrders, getOrderById, updateOrderStatus } = require('../api/ordersHandlers');
const { uploadPODocument, getOrderDocuments, downloadDocument } = require('../api/fileUploadHandlers');
const { protectRoute, requireAuth } = require('./authMiddleware');
const { sendJSONResponse } = require('./requestUtils');

async function routeRequest(req, res) { // Added async here
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;
  const path = parsedUrl.pathname;

  console.log(`Received request: ${method} ${path}`);  // Regex for specific ID routes
  const partIdRegex = /^\/api\/parts\/([^\/]+)$/;
  const assemblyIdRegex = /^\/api\/assemblies\/([^\/]+)$/;
  const orderIdRegex = /^\/api\/orders\/([^\/]+)$/;
  const orderStatusRegex = /^\/api\/orders\/([^\/]+)\/status$/;
  const orderUploadRegex = /^\/api\/orders\/([^\/]+)\/upload-document$/;
  const orderDocumentsRegex = /^\/api\/orders\/([^\/]+)\/documents$/;
  const documentDownloadRegex = /^\/api\/documents\/([^\/]+)\/download$/;
  let match;

  // Authentication routes (public)
  if (method === 'POST' && path === '/api/auth/register') {
    await register(req, res);
  } else if (method === 'POST' && path === '/api/auth/login') {
    await login(req, res);  } else if (method === 'GET' && path === '/api/auth/me') {
    await protectRoute(getCurrentUser)(req, res);

  // Test authorization routes
  } else if (method === 'GET' && path === '/api/admin/test') {
    await requireAuth('ADMIN')(adminTest)(req, res);
  } else if (method === 'GET' && path === '/api/production/test') {
    await requireAuth('PRODUCTION_COORDINATOR', 'ADMIN')(productionTest)(req, res);

  // Product data routes (public for now, can be protected later)
  } else if (method === 'GET' && path === '/api/parts') {
    await getParts(req, res);
  } else if (method === 'GET' && (match = path.match(partIdRegex))) {
    const partId = match[1];
    await getPartById(req, res, partId);
  } else if (method === 'GET' && path === '/api/assemblies') {
    await getAssemblies(req, res);
  } else if (method === 'GET' && (match = path.match(assemblyIdRegex))) {
    const assemblyId = match[1];
    await getAssemblyById(req, res, assemblyId);
  } else if (method === 'GET' && path === '/api/categories') {
    await getCategories(req, res);  } else if (method === 'POST' && path === '/api/bom/generate') {
    await handleGenerateBom(req, res);

  // Order routes (protected)
  // DEPRECATED: Use Next.js API Routes in app/api/orders/*.ts (see v5 Coding Prompt Chains)
  // else if (method === 'POST' && path === '/api/orders') {
  //   await requireAuth('PRODUCTION_COORDINATOR', 'ADMIN')(createOrder)(req, res);
  // } else if (method === 'GET' && path === '/api/orders') {
  //   await protectRoute(getOrders)(req, res);
  // } else if (method === 'GET' && (match = path.match(orderIdRegex))) {
  //   const orderId = match[1];
  //   await protectRoute(getOrderById)(req, res, orderId);
  // } else if (method === 'PUT' && (match = path.match(orderStatusRegex))) {
  //   const orderId = match[1];
  //   await protectRoute(updateOrderStatus)(req, res, orderId);

  // File upload routes (protected)
  // DEPRECATED: Use Next.js API Routes in app/api/upload/*.ts (see v5 Coding Prompt Chains)
  // else if (method === 'POST' && (match = path.match(orderUploadRegex))) {
  //   const orderId = match[1];
  //   await requireAuth('PRODUCTION_COORDINATOR', 'ADMIN')(uploadPODocument)(req, res, orderId);
  // } else if (method === 'GET' && (match = path.match(orderDocumentsRegex))) {
  //   const orderId = match[1];
  //   await protectRoute(getOrderDocuments)(req, res, orderId);
  // } else if (method === 'GET' && (match = path.match(documentDownloadRegex))) {
  //   const documentId = match[1];
  //   await protectRoute(downloadDocument)(req, res, documentId);

  // Configurator routes
  // DEPRECATED: Use Next.js API Routes in app/api/configurator/route.ts & app/api/accessories/route.ts (see v5 Coding Prompt Chains)
  // else if (method === 'GET' && path === '/api/configurator/sink-models') {
  //   await getSinkModelsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/leg-types') {
  //   await getLegTypesHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/feet-types') {
  //   await getFeetTypesHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/pegboard-options') {
  //   await getPegboardOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/basin-type-options') {
  //   await getBasinTypeOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/basin-size-options') {
  //   await getBasinSizeOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/basin-addon-options') {
  //   await getBasinAddonOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/faucet-type-options') {
  //   await getFaucetTypeOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/sprayer-type-options') {
  //   await getSprayerTypeOptionsHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/accessory-categories') {
  //   await getAccessoryCategoriesHandler(req, res);
  // } else if (method === 'GET' && path === '/api/configurator/accessories') {
  //   await getAccessoriesByCategoryHandler(req, res);
  } else {
    sendJSONResponse(res, 404, { error: 'Not Found' });
  }
}

module.exports = { routeRequest };
