const { AssemblyType } = require('@prisma/client'); // Added AssemblyType
const { prisma } = require('../config');
const { sendJSONResponse } = require('../lib/requestUtils');
const url = require('url'); // Added for parsing query parameters

// Implementing getAssemblies to fetch all assemblies with their components and subcategories
async function getAssemblies(req, res) {
  const parsedUrl = url.parse(req.url, true);
  // Example: Add filtering by type, name, or pagination as done for parts
  const { type, name, page = 1, limit = 10, categoryCode, subcategoryCode } = parsedUrl.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  const whereClause = {};
  if (type) {
    if (Object.values(AssemblyType).includes(type.toUpperCase())) {
      whereClause.type = type.toUpperCase();
    } else {
      return sendJSONResponse(res, 400, { error: `Invalid assembly type: ${type}. Valid types are ${Object.values(AssemblyType).join(', ')}` });
    }
  }
  if (name) {
    whereClause.name = {
      contains: name,
      mode: 'insensitive',
    };
  }
  if (categoryCode) {
    whereClause.categoryCode = categoryCode;
  }
  if (subcategoryCode) {
    whereClause.subcategoryCode = subcategoryCode;
  }

  try {
    const assemblies = await prisma.assembly.findMany({
      where: whereClause,
      skip: offset,
      take: limitNum,
      include: {
        components: {
          include: {
            childPart: true, // Include details of the part
            childAssembly: { // Include details if the component is another assembly
              include: {
                // Potentially include components of the child assembly if needed (can lead to deep nesting)
                // components: true, // Be cautious with recursive depth
              }
            },
          },
        },
        // The relation from Assembly to Subcategory is many-to-many through _AssemblyToSubcategory (implicit)
        // or directly if defined as `subcategories Subcategory[] @relation("SubcategoryAssemblies")`
        // Prisma handles this automatically if the relation is defined in schema.prisma
        // However, the schema shows `subcategories Subcategory[] @relation("SubcategoryAssemblies")` on Assembly
        // and `assemblies Assembly[] @relation("SubcategoryAssemblies")` on Subcategory.
        // This is an implicit many-to-many. To fetch subcategories for an assembly, you might need to query Subcategory table
        // or adjust the query if Prisma's default include doesn't fetch it as expected.
        // For now, assuming direct include works based on schema structure for `categoryCode` and `subcategoryCode` fields.
        // If you want to list assemblies BELONGING to a subcategory, you'd query Subcategory and include assemblies.
        // The current model has `categoryCode` and `subcategoryCode` as direct string fields on Assembly.
        // If these are meant to be foreign keys to Category/Subcategory tables, the schema should reflect that with relations.
        // For now, we will assume they are just codes and not relations to be included directly.
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalAssemblies = await prisma.assembly.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(totalAssemblies / limitNum);

    sendJSONResponse(res, 200, {
      data: assemblies,
      totalItems: totalAssemblies,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error('Error fetching assemblies:', error);
    sendJSONResponse(res, 500, { error: 'Failed to fetch assemblies', details: error.message });
  }
}

// Implementing getAssemblyById to fetch a single assembly by ID with its components and subcategories
async function getAssemblyById(req, res, assemblyIdFromPath) { // Renamed assemblyId to assemblyIdFromPath
  const { assemblyId } = req.params || { assemblyId: assemblyIdFromPath }; // Ensure assemblyId is correctly obtained

  try {
    const assembly = await prisma.assembly.findUnique({
      where: { assemblyId: assemblyId },
      include: {
        components: {
          orderBy: { id: 'asc' }, // Optional: order components
          include: {
            childPart: true,
            childAssembly: {
              include: {
                // components: true, // Again, be cautious with depth
              }
            },
          },
        },
        // Similar to getAssemblies, direct relations for category/subcategory are not defined on Assembly model for include.
        // categoryCode and subcategoryCode are string fields.
      },
    });
    if (!assembly) {
      return sendJSONResponse(res, 404, { error: 'Assembly not found' });
    }
    sendJSONResponse(res, 200, assembly);
  } catch (error) {
    console.error(`Error fetching assembly with ID ${assemblyId}:`, error);
    sendJSONResponse(res, 500, { error: 'Failed to fetch assembly', details: error.message });
  }
}

module.exports = {
  getAssemblies,
  getAssemblyById,
};
