import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'seminaire.mf.idf@gmail.com';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@2026!', 12);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Séminaire',
        role: UserRole.ADMIN,
      },
    });

    console.log(`Admin account created: ${adminEmail}`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
