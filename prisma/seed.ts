// prisma/seed.ts
import "dotenv/config";
import {
    PrismaClient,
    Role,
    CertStatus,
    CertLevel,
    RecipeStatus,
    IngredientReference,
    Prisma
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { initializeStorageBucket } from "../lib/s3-service";
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcrypt';

// Setup driver adapter for serverless/pg pooling environments
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ==========================================
// FUZZY MATCHING HELPER FUNCTIONS
// ==========================================

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix: number[][] = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[len1][len2];
}

// Calculate similarity score between two strings (0 to 1)
function getSimilarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;
    const distance = levenshteinDistance(str1, str2);
    return 1 - distance / maxLen;
}

// Find the best matching ingredient using a prioritized match cascade
function findBestMatchingIngredient(
    searchTerm: string,
    ingredientMap: Map<string, IngredientReference>,
    threshold: number = 0.4
): IngredientReference | undefined {
    const searchTermLower = searchTerm.toLowerCase();

    // 1. Try exact match first (case-insensitive)
    const exactMatch = Array.from(ingredientMap.keys()).find(
        key => key.toLowerCase() === searchTermLower
    );
    if (exactMatch) {
        return ingredientMap.get(exactMatch);
    }

    // 2. Try fast substring containment match
    const substringMatch = Array.from(ingredientMap.keys()).find(
        key => key.toLowerCase().includes(searchTermLower) || searchTermLower.includes(key.toLowerCase())
    );
    if (substringMatch) {
        return ingredientMap.get(substringMatch);
    }

    // 3. Fall back to Levenshtein fuzzy matching
    let bestMatch = null;
    let bestScore = 0;

    for (const [key, value] of ingredientMap) {
        const score = getSimilarity(searchTerm, key);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = value;
        }
    }

    if (bestMatch && bestScore >= threshold) {
        return bestMatch;
    }

    return undefined;
}

// Get ingredient with fuzzy matching and helpful error messages
const getIngredient = (searchTerm: string, ingredientMap: Map<string, IngredientReference>): IngredientReference => {
    const ingredient = findBestMatchingIngredient(searchTerm, ingredientMap);

    if (!ingredient) {
        const allKeys = Array.from(ingredientMap.keys());
        const suggestions = allKeys
            .map(key => ({ key, score: getSimilarity(searchTerm, key) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => `  - ${item.key} (${Math.round(item.score * 100)}% match)`);

        throw new Error(
            `❌ Could not find ingredient matching "${searchTerm}".\n` +
            `Did you mean one of these?\n${suggestions.join('\n')}`
        );
    }
    return ingredient;
};

interface SeedIngredient {
    name: string;
    name_ar?: string | null;
    calories_per_g: number;
    protein_per_g: number;
    carbs_per_g: number;
    fat_per_g: number;
    allergens?: string[] | null;
}

async function main() {
    console.log(`🌱 Seeding expanded localized testing dataset...`);
    const filePath = path.join(__dirname, 'food_db.json');
    const ingredients: SeedIngredient[] = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SeedIngredient[];
    console.log(`📦 Loading ${ingredients.length} ingredients from food_db.json...`);

    // 1. Clean up existing records safely to prevent runtime seeding unique violations
    await prisma.auditLog.deleteMany({});
    await prisma.recipeVersion.deleteMany({});
    await prisma.recipeIngredient.deleteMany({});
    await prisma.recipe.deleteMany({});
    await prisma.recipeDraft.deleteMany({});
    await prisma.kitchenControlProfile.deleteMany({});
    await prisma.ingredientReference.deleteMany({});
    await prisma.restaurant.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('🧹 Cleaned database tables.');

    // Initialize storage bucket for uploads
    try {
        await initializeStorageBucket();
    } catch (err) {
        console.error("❌ Failed to initialize storage bucket (uploads may not work until MinIO is reachable):", err);
    }

    // ==========================================
    // 2. CREATE USERS (Platform Staff & Authorities)
    // ==========================================
    const sharedPasswordHash = await bcrypt.hash('123456', 10);

    await prisma.user.create({
        data: { email: 'sara@platform.com', password_hash: sharedPasswordHash, role: Role.platform_admin, full_name: 'Sara', phone_number: '+962791111111' }
    });

    await prisma.user.create({
        data: { email: 'rima@platform.com', password_hash: sharedPasswordHash, role: Role.platform_admin, full_name: 'Rima', phone_number: '+962792222222' }
    });

    await prisma.user.create({
        data: { email: 'maha@jfda.gov.jo', password_hash: sharedPasswordHash, role: Role.nutritionist_auditor, full_name: 'Dr. Maha', phone_number: '+962793333333' }
    });

    await prisma.user.create({
        data: { email: 'deema@jfda.gov.jo', password_hash: sharedPasswordHash, role: Role.jfda_officer, full_name: 'Deema Officer', phone_number: '+962794444444' }
    });

    // ==========================================
    // 3. CREATE USERS (Restaurant Owners)
    // ==========================================
    const ownerLeen = await prisma.user.create({
        data: { email: 'leen@dumplings.com', password_hash: sharedPasswordHash, role: Role.restaurant_owner, full_name: 'Leen', phone_number: '+962795555555' }
    });

    const ownerMira = await prisma.user.create({
        data: { email: 'mira@morningcafe.com', password_hash: sharedPasswordHash, role: Role.restaurant_owner, full_name: 'Mira', phone_number: '+962796666666' }
    });

    const ownerAdam = await prisma.user.create({
        data: { email: 'adam@leanburgers.com', password_hash: sharedPasswordHash, role: Role.restaurant_owner, full_name: 'Adam', phone_number: '+962797777777' }
    });

    const ownerDev = await prisma.user.create({
        data: { email: 'dev-owner@localhost.com', password_hash: sharedPasswordHash, role: Role.restaurant_owner, full_name: 'Development Default Owner', phone_number: '+962790000000' }
    });

    console.log('👤 Seeded administrative and owner user accounts with encrypted credentials.');

    // ==========================================
    // 4. SEED INGREDIENT REFERENCES (Global Items)
    // ==========================================
    const ingredientMap = new Map<string, IngredientReference>();

    for (const ingredient of ingredients) {
        const existing = await prisma.ingredientReference.findUnique({ where: { name: ingredient.name } });
        if (existing) {
            const updateData = {
                calories_per_g: ingredient.calories_per_g,
                protein_per_g: ingredient.protein_per_g,
                carbs_per_g: ingredient.carbs_per_g,
                fat_per_g: ingredient.fat_per_g,
                allergens: ingredient.allergens || [],
                ...(ingredient.name_ar ? { name_ar: ingredient.name_ar } : {}),
            };
            const updated = await prisma.ingredientReference.update({
                where: { id: existing.id },
                data: updateData as Prisma.IngredientReferenceUpdateInput,
            });
            ingredientMap.set(ingredient.name, updated);
        } else {
            const createData = {
                name: ingredient.name,
                name_ar: ingredient.name_ar ?? '',
                calories_per_g: ingredient.calories_per_g,
                protein_per_g: ingredient.protein_per_g,
                carbs_per_g: ingredient.carbs_per_g,
                fat_per_g: ingredient.fat_per_g,
                allergens: ingredient.allergens || [],
            };
            const created = await prisma.ingredientReference.create({
                data: createData as Prisma.IngredientReferenceCreateInput,
            });
            ingredientMap.set(ingredient.name, created);
        }
    }

    console.log(`🌾 Populated ${ingredientMap.size} analytical ingredient reference tables.`);

    // ==========================================
    // 5. CREATE RESTAURANTS & DEPENDENT DATA
    // ==========================================

    const allIngredients = await prisma.ingredientReference.findMany();

    const getRandomIngredients = (count: number) => {
        const shuffled = [...allIngredients].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    };

    // --- Restaurant 1: The "Perfect" Case (Active, Level 3) ---
    const restLeen = await prisma.restaurant.create({
        data: {
            slug: 'leen-dumplings',
            business_name: 'Leen Dumplings & Breakfast',
            address_line: 'Rainbow Street, Amman',
            cert_status: CertStatus.ACTIVE,
            cert_level: CertLevel.LEVEL_3,
            owner_id: ownerLeen.id,
            profile: {
                create: {
                    hasDedicatedAllergenZones: true,
                    usesStandardizedRecipes: true
                }
            }
        }
    });

    const avocado = getIngredient('avocado', ingredientMap);
    const tomato = getIngredient('tomato', ingredientMap);
    const bread = getIngredient('bread', ingredientMap);

    // Seed Recipe 1: Approved Avocado Toast
    const avocadoToast = await prisma.recipe.create({
        data: {
            restaurant_id: restLeen.id,
            meal_name: 'Avocado Sun-Dried Tomato Toast',
            image_url: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'Sliced avocado laid over warm sourdough toast garnished with sun-dried local tomatoes.',
            calories: 320.00,
            protein: 12.00,
            carbs: 28.00,
            total_fat: 18.00,
            status: RecipeStatus.APPROVED,
            ingredients: {
                create: [
                    { ingredient_id: bread.id, user_stated_amount: '2 slices', normalized_grams: 60.0 },
                    { ingredient_id: avocado.id, user_stated_amount: '1 medium', normalized_grams: 150.0 },
                    { ingredient_id: tomato.id, user_stated_amount: '2 slices', normalized_grams: 30.0 }
                ]
            }
        },
        include: { ingredients: { include: { ingredient_item: true } } }
    });

    // Create Historical Approved Version Snapshot for Avocado Toast
    await prisma.recipeVersion.create({
        data: {
            recipe_id: avocadoToast.id,
            snapshot: {
                meal_name: avocadoToast.meal_name,
                image_url: avocadoToast.image_url,
                preparation_notes: avocadoToast.preparation_notes,
                calories: avocadoToast.calories.toString(),
                protein: avocadoToast.protein.toString(),
                carbs: avocadoToast.carbs.toString(),
                total_fat: avocadoToast.total_fat.toString(),
                detected_allergens: avocadoToast.detected_allergens,
                ingredients: avocadoToast.ingredients.map(i => ({
                    ingredient_id: i.ingredient_id,
                    user_stated_amount: i.user_stated_amount,
                    normalized_grams: i.normalized_grams.toString()
                }))
            }
        }
    });

    // Seed Recipe 2: Pending Dumplings
    await prisma.recipe.create({
        data: {
            restaurant_id: restLeen.id,
            meal_name: 'Chicken Dumplings (6pcs)',
            image_url: 'https://images.unsplash.com/photo-1496116211227-724f4247504a?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'Hand-rolled dumpling wraps loaded with seasoned minced chicken breast, steamed to order.',
            calories: 250.00,
            protein: 20.00,
            carbs: 30.00,
            total_fat: 8.00,
            status: RecipeStatus.PENDING,
            ingredients: {
                create: [
                    { ingredient_id: getIngredient('Minced Chicken Breast Fillet', ingredientMap).id, user_stated_amount: '120g premium chicken wrap', normalized_grams: 120.0 }
                ]
            }
        }
    });

    // --- Restaurant 2: The "Newbie" Case (Pending, Level 1) ---
    const restMira = await prisma.restaurant.create({
        data: {
            slug: 'mira-morning-cafe',
            business_name: 'Mira Morning Cafe',
            address_line: 'Weibdeh, Amman',
            cert_status: CertStatus.PENDING,
            cert_level: CertLevel.LEVEL_1,
            owner_id: ownerMira.id,
            profile: {
                create: {
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: true
                }
            }
        }
    });

    const coffee = getIngredient('coffee', ingredientMap);
    const yogurt = getIngredient('yogurt', ingredientMap);
    const honey = getIngredient('honey', ingredientMap);

    await prisma.recipe.create({
        data: {
            restaurant_id: restMira.id,
            meal_name: 'Iced Turkish Coffee',
            image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'Traditional unfiltered chilled coffee served over clear cracked ice with drops of cardamom.',
            calories: 80.00,
            protein: 1.00,
            carbs: 15.00,
            total_fat: 2.00,
            status: RecipeStatus.PENDING,
            ingredients: {
                create: [
                    { ingredient_id: coffee.id, user_stated_amount: '2 scoops', normalized_grams: 15.0 }
                ]
            }
        }
    });

    await prisma.recipe.create({
        data: {
            restaurant_id: restMira.id,
            meal_name: 'Low Fat Greek Yogurt Parfait',
            image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'Strained low fat yogurt topped with organic mountain honey syrup and dried raisins.',
            calories: 150.00,
            protein: 15.00,
            carbs: 20.00,
            total_fat: 0.00,
            status: RecipeStatus.REJECTED,
            rejection_reason: 'Sugar content exceeds certified Level 1 threshold limits.',
            ingredients: {
                create: [
                    { ingredient_id: yogurt.id, user_stated_amount: '200g yogurt', normalized_grams: 200.0 },
                    { ingredient_id: honey.id, user_stated_amount: '1 tablespoon', normalized_grams: 15.0 }
                ]
            }
        }
    });

    // --- Restaurant 3: The "Trouble" Case (Revoked) ---
    const restAdam = await prisma.restaurant.create({
        data: {
            slug: 'adam-lean-burgers',
            business_name: 'Adam 93 Lean Burgers',
            address_line: 'Abdoun, Amman',
            cert_status: CertStatus.REVOKED,
            cert_level: CertLevel.LEVEL_2,
            owner_id: ownerAdam.id,
            profile: {
                create: {
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: false
                }
            }
        }
    });

    const beef = getIngredient('beef', ingredientMap);
    const lettuce = getIngredient('lettuce', ingredientMap);

    await prisma.recipe.create({
        data: {
            restaurant_id: restAdam.id,
            meal_name: '93% Lean Beef Burger',
            image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'Flame grilled lean ground brisket served on cross-cut whole wheat buns.',
            calories: 450.00,
            protein: 40.00,
            carbs: 35.00,
            total_fat: 15.00,
            status: RecipeStatus.REVOKED,
            rejection_reason: 'Random unannounced laboratory audit revealed real fat structural layers closer to 20%.',
            ingredients: {
                create: [
                    { ingredient_id: beef.id, user_stated_amount: '200g patty', normalized_grams: 200.0 },
                    { ingredient_id: bread.id, user_stated_amount: '1 bun', normalized_grams: 80.0 },
                    { ingredient_id: lettuce.id, user_stated_amount: '2 leaves', normalized_grams: 15.0 }
                ]
            }
        }
    });

    console.log(`✅ Seeded 3 diverse relational restaurant datasets with structured recipe links, slugs, and kitchen profiles.`);

    // --- Restaurant 4: Development Default Tenant ---
    const restDevTenant = await prisma.restaurant.create({
        data: {
            slug: 'dev-tenant',
            business_name: 'Development Test Restaurant',
            address_line: 'localhost',
            cert_status: CertStatus.ACTIVE,
            cert_level: CertLevel.LEVEL_3,
            owner_id: ownerDev.id,
            profile: {
                create: {
                    hasDedicatedAllergenZones: true,
                    usesStandardizedRecipes: true
                }
            }
        }
    });

    const testIngs = getRandomIngredients(3);
    await prisma.recipe.create({
        data: {
            restaurant_id: restDevTenant.id,
            meal_name: 'Development Test Dish',
            image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
            preparation_notes: 'A test dish for development purposes.',
            calories: 250.00,
            protein: 15.00,
            carbs: 20.00,
            total_fat: 12.00,
            status: RecipeStatus.APPROVED,
            ingredients: {
                create: testIngs.map(ing => ({
                    ingredient_id: ing.id,
                    user_stated_amount: 'Test portion',
                    normalized_grams: 100.0
                }))
            }
        }
    });

    console.log(`✅ Seeded development default tenant for localhost testing (ID: ${restDevTenant.id}).`);
}

main()
    .catch((e) => {
        console.error("❌ Seeding execution failed: ", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });