const { PartType, Status } = require('@prisma/client'); // Added PartType and Status
const { prisma } = require('../config');
const { sendJSONResponse } = require('../lib/requestUtils');
const url = require('url'); // Added for parsing query parameters

async function getParts(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const { type, status, name, page = 1, limit = 10 } = parsedUrl.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};
  if (type) {
    if (Object.values(PartType).includes(type.toUpperCase())) {
      whereClause.type = type.toUpperCase();
    } else {
      return sendJSONResponse(res, 400, { error: `Invalid part type: ${type}. Valid types are ${Object.values(PartType).join(', ')}` });
    }
  }
  if (status) {
    if (Object.values(Status).includes(status.toUpperCase())) {
      whereClause.status = status.toUpperCase();
    } else {
      return sendJSONResponse(res, 400, { error: `Invalid status: ${status}. Valid statuses are ${Object.values(Status).join(', ')}` });
    }
  }
  if (name) {
    whereClause.name = {
      contains: name,
      mode: 'insensitive', // Case-insensitive search
    };
  }

  try {
    const parts = await prisma.part.findMany({
      where: whereClause,
      skip: offset,
      take: limitNum,
      orderBy: {
        createdAt: 'desc', // Default sort order
      },
      // Removed category and subcategory includes as Part model does not have direct relations to them
    });

    const totalParts = await prisma.part.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalParts / limitNum);

    sendJSONResponse(res, 200, {
      data: parts,
      totalItems: totalParts,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    sendJSONResponse(res, 500, { error: 'Failed to fetch parts', details: error.message });
  }
}

async function getPartById(req, res, partIdFromPath) { // Renamed partId to partIdFromPath to avoid conflict
  const { partId } = req.params || { partId: partIdFromPath }; // Ensure partId is correctly obtained
  try {
    const part = await prisma.part.findUnique({
      where: { partId: partId },
      // Removed category and subcategory includes
    });
    if (!part) {
      return sendJSONResponse(res, 404, { error: 'Part not found' });
    }
    sendJSONResponse(res, 200, part);
  } catch (error) {
    console.error(`Error fetching part with ID ${partId}:`, error);
    sendJSONResponse(res, 500, { error: 'Failed to fetch part', details: error.message });
  }
}

module.exports = {
  getParts,
  getPartById,
};
