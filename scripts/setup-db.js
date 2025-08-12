const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Create a demo user
    const hashedPassword = await bcrypt.hash('demo123', 12);

    const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
            email: 'demo@example.com',
            password: hashedPassword,
            name: 'Demo User',
        },
    });

    console.log('Demo user created:', user.email);

    // Create some sample contacts
    const contacts = await Promise.all([
        prisma.contact.upsert({
            where: { email_userId: { email: 'john@example.com', userId: user.id } },
            update: {},
            create: {
                email: 'john@example.com',
                name: 'John Doe',
                userId: user.id,
            },
        }),
        prisma.contact.upsert({
            where: { email_userId: { email: 'jane@example.com', userId: user.id } },
            update: {},
            create: {
                email: 'jane@example.com',
                name: 'Jane Smith',
                userId: user.id,
            },
        }),
        prisma.contact.upsert({
            where: { email_userId: { email: 'bob@example.com', userId: user.id } },
            update: {},
            create: {
                email: 'bob@example.com',
                name: 'Bob Johnson',
                userId: user.id,
            },
        }),
    ]);

    console.log('Sample contacts created:', contacts.length);

    // Create a sample group
    const group = await prisma.group.create({
        data: {
            name: 'Marketing Team',
            description: 'Marketing department contacts',
            userId: user.id,
            contacts: {
                create: contacts.map(contact => ({ contactId: contact.id })),
            },
        },
    });

    console.log('Sample group created:', group.name);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });