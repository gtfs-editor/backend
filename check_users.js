
import 'dotenv/config';
import { prisma } from './src/utils/prisma.js';

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, username: true }
        });
        console.log("Users in DB:", JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
