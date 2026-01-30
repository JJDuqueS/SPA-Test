import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) return;

  await prisma.product.createMany({
    data: [
      {
        name: "Auriculares Bluetooth",
        description: "Cancelación de ruido, 40h batería.",
        priceCents: 199900,
        stock: 8,
        imageUrl: "https://picsum.photos/seed/headphones/640/480",
      },
      {
        name: "Teclado Mecánico",
        description: "Switches lineales, RGB, hot-swap.",
        priceCents: 299900,
        stock: 5,
        imageUrl: "https://picsum.photos/seed/keyboard/640/480",
      },
      {
        name: "Mouse Inalámbrico",
        description: "Baja latencia, sensor 26K DPI.",
        priceCents: 149900,
        stock: 10,
        imageUrl: "https://picsum.photos/seed/mouse/640/480",
      },
    ],
  });
}

async function shutdown() {
  await prisma.$disconnect();
  await pool.end();
}

main()
  .then(shutdown)
  .catch(async (e) => {
    console.error(e);
    await shutdown();
    process.exit(1);
  });
