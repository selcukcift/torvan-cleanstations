/**
 * Core Data Seeder Module
 * 
 * Handles seeding of foundational data: categories, subcategories, and base system data
 */

const fs = require('fs').promises;
const path = require('path');

class CoreDataSeeder {
  constructor(prismaClient) {
    this.prisma = prismaClient;
    this.moduleName = 'CoreDataSeeder';
  }

  async seed() {
    console.log('   📁 Seeding core categories and foundational data...');
    
    const results = {
      categories: 0,
      subcategories: 0,
      totalItems: 0
    };

    // Seed categories from JSON
    const categoriesResult = await this.seedCategories();
    results.categories = categoriesResult.created;
    results.subcategories = categoriesResult.subcategories;
    results.totalItems = categoriesResult.created + categoriesResult.subcategories;

    return results;
  }

  async seedCategories() {
    const categoriesPath = path.join(__dirname, '../../resources/categories.json');
    const categoriesData = JSON.parse(await fs.readFile(categoriesPath, 'utf-8'));
    
    let categoriesCreated = 0;
    let subcategoriesCreated = 0;

    for (const [categoryId, categoryData] of Object.entries(categoriesData.categories)) {
      // Create category if it doesn't exist
      const existingCategory = await this.prisma.category.findUnique({
        where: { categoryId }
      });

      if (!existingCategory) {
        await this.prisma.category.create({
          data: {
            categoryId,
            name: categoryData.name,
            description: categoryData.description
          }
        });
        categoriesCreated++;
      }

      // Create subcategories
      if (categoryData.subcategories) {
        for (const [subId, subData] of Object.entries(categoryData.subcategories)) {
          const existingSubcategory = await this.prisma.subcategory.findUnique({
            where: { subcategoryId: subId }
          });

          if (!existingSubcategory) {
            await this.prisma.subcategory.create({
              data: {
                subcategoryId: subId,
                name: subData.name,
                description: subData.description,
                categoryId
              }
            });
            subcategoriesCreated++;
          }
        }
      }
    }

    return { created: categoriesCreated, subcategories: subcategoriesCreated };
  }
}

module.exports = CoreDataSeeder;