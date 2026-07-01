import "dotenv/config";
import {
    PrismaClient,
    Role,
    CertStatus,
    CertLevel,
    RecipeStatus
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Setup driver adapter for serverless/pg pooling environments
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log(`🌱 Seeding expanded localized testing dataset...`);

    // 1. Clean up existing records safely to prevent runtime seeding unique violations
    // We added KitchenControlProfile to the teardown pipeline
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

    // ==========================================
    // 2. CREATE USERS (Platform Staff & Authorities)
    // ==========================================
    const adminSara = await prisma.user.upsert({
        where: { email: 'sara@platform.com' },
        update: {},
        create: { email: 'sara@platform.com', password_hash: '123456', role: Role.platform_admin, full_name: 'Sara', phone_number: '+962791111111' }
    });

    const adminRima = await prisma.user.upsert({
        where: { email: 'rima@platform.com' },
        update: {},
        create: { email: 'rima@platform.com', password_hash: '123456', role: Role.platform_admin, full_name: 'Rima', phone_number: '+962792222222' }
    });

    const auditorMaha = await prisma.user.upsert({
        where: { email: 'maha@jfda.gov.jo' },
        update: {},
        create: { email: 'maha@jfda.gov.jo', password_hash: '123456', role: Role.nutritionist_auditor, full_name: 'Dr. Maha', phone_number: '+962793333333' }
    });

    const officerDeema = await prisma.user.upsert({
        where: { email: 'deema@jfda.gov.jo' },
        update: {},
        create: { email: 'deema@jfda.gov.jo', password_hash: '123456', role: Role.jfda_officer, full_name: 'Deema Officer', phone_number: '+962794444444' }
    });

    // ==========================================
    // 3. CREATE USERS (Restaurant Owners)
    // ==========================================
    const ownerLeen = await prisma.user.upsert({
        where: { email: 'leen@dumplings.com' },
        update: {},
        create: { email: 'leen@dumplings.com', password_hash: '123456', role: Role.restaurant_owner, full_name: 'Leen', phone_number: '+962795555555' }
    });

    const ownerMira = await prisma.user.upsert({
        where: { email: 'mira@morningcafe.com' },
        update: {},
        create: { email: 'mira@morningcafe.com', password_hash: '123456', role: Role.restaurant_owner, full_name: 'Mira', phone_number: '+962796666666' }
    });

    const ownerAdam = await prisma.user.upsert({
        where: { email: 'adam@leanburgers.com' },
        update: {},
        create: { email: 'adam@leanburgers.com', password_hash: '123456', role: Role.restaurant_owner, full_name: 'Adam', phone_number: '+962797777777' }
    });

    console.log('👤 Seeded administrative and owner user accounts.');

    // ==========================================
    // 4. SEED INGREDIENT REFERENCES (Global Items)
    // ==========================================
    const ingAvocado = await prisma.ingredientReference.create({
        data: { name: 'Fresh Hass Avocado', calories_per_g: 1.60, protein_per_g: 0.02, carbs_per_g: 0.09, fat_per_g: 0.15 }
    });

    const ingToast = await prisma.ingredientReference.create({
        data: { name: 'Artisan Sourdough Slice', calories_per_g: 2.50, protein_per_g: 0.08, carbs_per_g: 0.48, fat_per_g: 0.01 }
    });

    const ingChicken = await prisma.ingredientReference.create({
        data: { name: 'Minced Chicken Breast Fillet', calories_per_g: 1.20, protein_per_g: 0.23, carbs_per_g: 0.00, fat_per_g: 0.02 }
    });

    const ingCoffee = await prisma.ingredientReference.create({
        data: { name: 'Dark Roast Turkish Coffee Grounds', calories_per_g: 0.50, protein_per_g: 0.01, carbs_per_g: 0.10, fat_per_g: 0.00 }
    });

    console.log('🌾 Populated analytical ingredient reference tables.');

    // ==========================================
    // 5. CREATE RESTAURANTS & DEPENDENT DATA
    // ==========================================

    // --- Restaurant 1: The "Perfect" Case (Active, Level 3) ---
    const restLeen = await prisma.restaurant.create({
        data: {
            slug: 'leen-dumplings', // ADDED TENANT SLUG
            business_name: 'Leen Dumplings & Breakfast',
            address_line: 'Rainbow Street, Amman',
            cert_status: CertStatus.ACTIVE,
            cert_level: CertLevel.LEVEL_3,
            owner_id: ownerLeen.id,
            profile: {
                create: { // ADDED KITCHEN CONTROL PROFILE
                    hasDedicatedAllergenZones: true,
                    usesStandardizedRecipes: true
                }
            }
        }
    });

    // Seed Recipe 1: Approved Avocado Toast
    const avocadoToast = await prisma.recipe.create({
        data: {
            restaurant_id: restLeen.id,
            meal_name: 'Avocado Sun-Dried Tomato Toast',
            image_url: 'https://images.storage.jo/meals/avocado-toast.jpg',
            preparation_notes: 'Sliced avocado laid over warm sourdough toast garnished with sun-dried local tomatoes.',
            calories: 320.00,
            protein: 12.00,
            carbs: 28.00,
            total_fat: 18.00,
            status: RecipeStatus.APPROVED,
            ingredients: {
                create: [
                    { ingredient_id: ingToast.id, user_stated_amount: '1 Thick Slice', normalized_grams: 80.0 },
                    { ingredient_id: ingAvocado.id, user_stated_amount: 'Half an avocado', normalized_grams: 70.0 }
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
                calories: avocadoToast.calories.toString(),
                protein: avocadoToast.protein.toString(),
                carbs: avocadoToast.carbs.toString(),
                total_fat: avocadoToast.total_fat.toString(),
                ingredients: avocadoToast.ingredients.map(i => ({
                    name: i.ingredient_item.name,
                    amount: i.user_stated_amount,
                    weight_g: i.normalized_grams.toString()
                }))
            }
        }
    });

    // Seed Recipe 2: Pending Dumplings
    await prisma.recipe.create({
        data: {
            restaurant_id: restLeen.id,
            meal_name: 'Chicken Dumplings (6pcs)',
            image_url: 'https://images.storage.jo/meals/chicken-dumpling.jpg',
            preparation_notes: 'Hand-rolled dumpling wraps loaded with seasoned minced chicken breast, steamed to order.',
            calories: 250.00,
            protein: 20.00,
            carbs: 30.00,
            total_fat: 8.00,
            status: RecipeStatus.PENDING,
            ingredients: {
                create: [
                    { ingredient_id: ingChicken.id, user_stated_amount: '120g premium chicken wrap', normalized_grams: 120.0 }
                ]
            }
        }
    });

    // --- Restaurant 2: The "Newbie" Case (Pending, Level 1) ---
    const restMira = await prisma.restaurant.create({
        data: {
            slug: 'mira-morning-cafe', // ADDED TENANT SLUG
            business_name: 'Mira Morning Cafe',
            address_line: 'Weibdeh, Amman',
            cert_status: CertStatus.PENDING,
            cert_level: CertLevel.LEVEL_1,
            owner_id: ownerMira.id,
            profile: {
                create: { // ADDED KITCHEN CONTROL PROFILE
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: true
                }
            }
        }
    });

    await prisma.recipe.create({
        data: {
            restaurant_id: restMira.id,
            meal_name: 'Iced Turkish Coffee',
            image_url: 'https://images.storage.jo/meals/iced-coffee.jpg',
            preparation_notes: 'Traditional unfiltered chilled coffee served over clear cracked ice with a drops of cardamom.',
            calories: 80.00,
            protein: 1.00,
            carbs: 15.00,
            total_fat: 2.00,
            status: RecipeStatus.PENDING,
            ingredients: {
                create: [
                    { ingredient_id: ingCoffee.id, user_stated_amount: '2 scoops', normalized_grams: 15.0 }
                ]
            }
        }
    });

    await prisma.recipe.create({
        data: {
            restaurant_id: restMira.id,
            meal_name: 'Low Fat Greek Yogurt Parfait',
            image_url: 'https://images.storage.jo/meals/yogurt-parfait.jpg',
            preparation_notes: 'Strained low fat yogurt topped with organic mountain honey syrup and dried raisins.',
            calories: 150.00,
            protein: 15.00,
            carbs: 20.00,
            total_fat: 0.00,
            status: RecipeStatus.REJECTED,
            rejection_reason: 'Sugar content exceeds certified Level 1 threshold limits.'
        }
    });

    // --- Restaurant 3: The "Trouble" Case (Revoked) ---
    const restAdam = await prisma.restaurant.create({
        data: {
            slug: 'adam-lean-burgers', // ADDED TENANT SLUG
            business_name: 'Adam 93 Lean Burgers',
            address_line: 'Abdoun, Amman',
            cert_status: CertStatus.REVOKED,
            cert_level: CertLevel.LEVEL_2,
            owner_id: ownerAdam.id,
            profile: {
                create: { // ADDED KITCHEN CONTROL PROFILE
                    hasDedicatedAllergenZones: false,
                    usesStandardizedRecipes: false
                }
            }
        }
    });

    await prisma.recipe.create({
        data: {
            restaurant_id: restAdam.id,
            meal_name: '93% Lean Beef Burger',
            image_url: 'https://images.storage.jo/meals/lean-burger.jpg',
            preparation_notes: 'Flame grilled lean ground brisket served on cross-cut whole wheat buns.',
            calories: 450.00,
            protein: 40.00,
            carbs: 35.00,
            total_fat: 15.00,
            status: RecipeStatus.REVOKED,
            rejection_reason: 'Random unannounced laboratory audit revealed real fat structural layers closer to 20%.'
        }
    });

    console.log(`✅ Seeded 3 diverse relational restaurant datasets with structured recipe links, slugs, and kitchen profiles.`);
}

main()
    .catch((e) => {
        console.error("❌ Seeding execution failed: ", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end(); // Safely shut down pg pooling pipeline
    });