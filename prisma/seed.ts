import "dotenv/config";
import {
    PrismaClient,
    Role,
    CertStatus,
    CertLevel,
    RecipeStatus,
    NotificationType
} from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL }));
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log(`🌱 Seeding expanded testing dataset...`);

    // ==========================================
    // 1. CREATE USERS (Platform Staff)
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
    // 2. CREATE USERS (Restaurant Owners)
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

    // ==========================================
    // 3. CREATE RESTAURANTS & LICENSES
    // ==========================================

    // Restaurant 1: The "Perfect" Case (Active, Level 3)
    let restLeen = await prisma.restaurant.findFirst({ where: { owner_id: ownerLeen.id } });
    if (!restLeen) {
        restLeen = await prisma.restaurant.create({
            data: {
                business_name: 'Leen Dumplings & Breakfast',
                address_line: 'Rainbow Street, Amman',
                contact_phone: '+96261111111',
                cert_status: CertStatus.ACTIVE,
                cert_level: CertLevel.LEVEL_3,
                owner_id: ownerLeen.id,
                owner_role: ownerLeen.role,
                license: {
                    create: {
                        license_number: 'JFDA-2026-001',
                        expiry_date: new Date('2027-01-01'),
                        document_url: 'https://aws.com/leen_license.pdf'
                    }
                },
                recipes: {
                    create: [
                        { meal_name: 'Avocado Sun-Dried Tomato Toast', calories: 320, protein: 12, carbs: 28, total_fat: 18, status: RecipeStatus.APPROVED },
                        { meal_name: 'Chicken Dumplings (6pcs)', calories: 250, protein: 20, carbs: 30, total_fat: 8, status: RecipeStatus.PENDING }
                    ]
                }
            }
        });
    }

    // Restaurant 2: The "Newbie" Case (Pending, No License Yet)
    let restMira = await prisma.restaurant.findFirst({ where: { owner_id: ownerMira.id } });
    if (!restMira) {
        restMira = await prisma.restaurant.create({
            data: {
                business_name: 'Mira Morning Cafe',
                address_line: 'Weibdeh, Amman',
                contact_phone: '+96262222222',
                cert_status: CertStatus.PENDING,
                cert_level: CertLevel.LEVEL_1,
                owner_id: ownerMira.id,
                owner_role: ownerMira.role,
                recipes: {
                    create: [
                        { meal_name: 'Iced Turkish Coffee', calories: 80, protein: 1, carbs: 15, total_fat: 2, status: RecipeStatus.PENDING },
                        { meal_name: 'Low Fat Greek Yogurt Parfait', calories: 150, protein: 15, carbs: 20, total_fat: 0, status: RecipeStatus.REJECTED, rejection_reason: 'Sugar content exceeds Level 1 limits.' }
                    ]
                }
            }
        });
    }

    // Restaurant 3: The "Trouble" Case (Revoked)
    let restAdam = await prisma.restaurant.findFirst({ where: { owner_id: ownerAdam.id } });
    if (!restAdam) {
        restAdam = await prisma.restaurant.create({
            data: {
                business_name: 'Adam 93 Lean Burgers',
                address_line: 'Abdoun, Amman',
                contact_phone: '+96263333333',
                cert_status: CertStatus.REVOKED,
                cert_level: CertLevel.LEVEL_2,
                owner_id: ownerAdam.id,
                owner_role: ownerAdam.role,
                license: {
                    create: {
                        license_number: 'JFDA-2025-999',
                        expiry_date: new Date('2025-12-31'), // Expired
                        document_url: 'https://aws.com/adam_license.pdf'
                    }
                },
                recipes: {
                    create: [
                        { meal_name: '93% Lean Beef Burger', calories: 450, protein: 40, carbs: 35, total_fat: 15, status: RecipeStatus.REVOKED, rejection_reason: 'Random audit revealed fat content closer to 20%.' }
                    ]
                }
            }
        });

        // Add an audit log to explain the revocation
        await prisma.auditLog.create({
            data: { action: 'REVOKED_CERTIFICATION', user_id: auditorMaha.id, rest_id: restAdam.id }
        });
    }

    console.log(`✅ Seeded 3 diverse restaurants with associated recipes and licenses.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });