import { PrismaClient, Role, UserStatus, LocationType } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || adminEmail === "admin@example.test" || adminPassword === "REPLACE_WITH_A_LONG_UNIQUE_PASSWORD") {
    throw new Error("Перед запуском seed задайте собственные ADMIN_EMAIL и ADMIN_PASSWORD в локальном env-файле. Шаблонные значения использовать нельзя.");
  }
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, status: UserStatus.ACTIVE, passwordHash: await hash(adminPassword, 12), name: process.env.ADMIN_NAME ?? "Администратор PR-Manager" },
    create: { name: process.env.ADMIN_NAME ?? "Администратор PR-Manager", email: adminEmail, passwordHash: await hash(adminPassword, 12), role: Role.ADMIN, status: UserStatus.ACTIVE },
  });
  const campus = await prisma.campus.findFirst({ where: { name: "Главный кампус" } }) ?? await prisma.campus.create({ data: { name: "Главный кампус" } });
  const building = await prisma.building.upsert({ where: { campusId_name: { campusId: campus.id, name: "Главный корпус" } }, update: {}, create: { name: "Главный корпус", campusId: campus.id } });
  const floor = await prisma.floor.upsert({ where: { buildingId_number: { buildingId: building.id, number: 1 } }, update: {}, create: { number: 1, buildingId: building.id } });
  await prisma.location.upsert({ where: { id: "seed-entrance-poster" }, update: {}, create: { id: "seed-entrance-poster", name: "Стенд у главного входа", type: LocationType.POSTER, capacity: 10, floorId: floor.id, description: "Информационный стенд в зоне основного потока студентов." } });
  console.log(`Seed complete. Admin: ${admin.email}`);
}

main().finally(() => prisma.$disconnect());
