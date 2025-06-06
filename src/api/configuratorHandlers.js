// DEPRECATED (2025-06-01): Configurator & accessories data is now served by Next.js API Routes (app/api/configurator/route.ts & app/api/accessories/route.ts) which call backend services, as per 'Coding Prompt Chains for Torvan Medical Workflow App Expansion (v5 - Hybrid Backend)'.
// This file will be removed in a future version. Do not add new logic here.
// See: resources/Coding Prompt Chains for Torvan Medical Workflow App Expansion (v4 - Next.js, Node.js, Prisma, PostgreSQL).md
const configuratorService = require('../services/configuratorService');
const { sendResponse, parseRequestBody } = require('../lib/requestUtils');
const url = require('url');

async function getSinkModelsHandler(req, res) {
    try {
        const queryParams = url.parse(req.url, true).query;
        const family = queryParams.family;
        if (!family) {
            return sendResponse(res, 400, { error: 'Family query parameter is required' });
        }
        const sinkModels = await configuratorService.getSinkModels(family);
        sendResponse(res, 200, sinkModels);
    } catch (error) {
        console.error('Error in getSinkModelsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getLegTypesHandler(req, res) {
    try {
        const legTypes = await configuratorService.getLegTypes();
        sendResponse(res, 200, legTypes);
    } catch (error) {
        console.error('Error in getLegTypesHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getFeetTypesHandler(req, res) {
    try {
        const feetTypes = await configuratorService.getFeetTypes();
        sendResponse(res, 200, feetTypes);
    } catch (error) {
        console.error('Error in getFeetTypesHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getPegboardOptionsHandler(req, res) {
    try {
        const pegboardOptions = await configuratorService.getPegboardOptions();
        sendResponse(res, 200, pegboardOptions);
    } catch (error) {
        console.error('Error in getPegboardOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getBasinTypeOptionsHandler(req, res) {
    try {
        const basinTypeOptions = await configuratorService.getBasinTypeOptions();
        sendResponse(res, 200, basinTypeOptions);
    } catch (error) {
        console.error('Error in getBasinTypeOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getBasinSizeOptionsHandler(req, res) {
    try {
        const basinSizeOptions = await configuratorService.getBasinSizeOptions();
        sendResponse(res, 200, basinSizeOptions);
    } catch (error) {
        console.error('Error in getBasinSizeOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getBasinAddonOptionsHandler(req, res) {
    try {
        const queryParams = url.parse(req.url, true).query;
        const basinType = queryParams.basinType;
        if (!basinType) {
            return sendResponse(res, 400, { error: 'basinType query parameter is required' });
        }
        const basinAddonOptions = await configuratorService.getBasinAddonOptions(basinType);
        sendResponse(res, 200, basinAddonOptions);
    } catch (error) {
        console.error('Error in getBasinAddonOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getFaucetTypeOptionsHandler(req, res) {
    try {
        const faucetTypeOptions = await configuratorService.getFaucetTypeOptions();
        sendResponse(res, 200, faucetTypeOptions);
    } catch (error) {
        console.error('Error in getFaucetTypeOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getSprayerTypeOptionsHandler(req, res) {
    try {
        const sprayerTypeOptions = await configuratorService.getSprayerTypeOptions();
        sendResponse(res, 200, sprayerTypeOptions);
    } catch (error) {
        console.error('Error in getSprayerTypeOptionsHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getAccessoryCategoriesHandler(req, res) {
    try {
        const accessoryCategories = await configuratorService.getAccessoryCategories();
        sendResponse(res, 200, accessoryCategories);
    } catch (error) {
        console.error('Error in getAccessoryCategoriesHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

async function getAccessoriesByCategoryHandler(req, res) {
    try {
        const queryParams = url.parse(req.url, true).query;
        const subcategoryCode = queryParams.subcategoryCode;
        if (!subcategoryCode) {
            return sendResponse(res, 400, { error: 'subcategoryCode query parameter is required' });
        }
        const accessories = await configuratorService.getAccessoriesByCategory(subcategoryCode);
        sendResponse(res, 200, accessories);
    } catch (error) {
        console.error('Error in getAccessoriesByCategoryHandler:', error);
        sendResponse(res, 500, { error: 'Internal server error' });
    }
}

module.exports = {
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
};
