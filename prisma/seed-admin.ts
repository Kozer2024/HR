import { PrismaClient, Role, UserStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12 || email === "admin@example.test" || password.startsWith("REPLACE_")) {
  throw new Error("Укажите непустые ADMIN_EMAIL и ADMIN_PASSWORD длиной минимум 12 символов.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
try {
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: Role.ADMIN, status: UserStatus.ACTIVE, passwordHash: await hash(password, 12), name: process.env.ADMIN_NAME ?? "Администратор" },
    create: { name: process.env.ADMIN_NAME ?? "Администратор", email, passwordHash: await hash(password, 12), role: Role.ADMIN, status: UserStatus.ACTIVE },
  });
  console.log(`Создан/обновлён администратор: ${admin.email}`);
} finally {
  await prisma.$disconnect();
}
