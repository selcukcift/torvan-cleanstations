const { prisma } = require('../config');
const { sendJSONResponse } = require('../lib/requestUtils');
const url = require('url'); // Added for parsing query parameters

// Implementing getCategories to fetch all categories with subcategories and assemblies
async function getCategories(req, res) {
  const parsedUrl = url.parse(req.url, true);
  // Example: Add filtering by name or pagination if needed in the future
  const { name, page = 1, limit = 10 } = parsedUrl.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};
  if (name) {
    whereClause.name = {
      contains: name,
      mode: 'insensitive',
    };
  }

  try {
    const categories = await prisma.category.findMany({
      where: whereClause,
      skip: offset,
      take: limitNum,
      include: {
        subcategories: {
          orderBy: { name: 'asc' }, // Optional: order subcategories by name
          include: {
            assemblies: {
              orderBy: { name: 'asc' }, // Optional: order assemblies by name
              include: { // Further include components if needed, be mindful of depth
                components: {
                  include: {
                    childPart: true,
                    childAssembly: true,
                  }
                }
              }
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const totalCategories = await prisma.category.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalCategories / limitNum);

    sendJSONResponse(res, 200, {
      data: categories,
      totalItems: totalCategories,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    sendJSONResponse(res, 500, { error: 'Failed to fetch categories', details: error.message });
  }
}

module.exports = {
  getCategories,
};
