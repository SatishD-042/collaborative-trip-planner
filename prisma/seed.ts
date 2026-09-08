import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const TAG_POOL = [
  "Beach",
  "Nightlife",
  "Nature",
  "Adventure",
  "Culture",
  "Food",
  "Relaxation",
  "Shopping",
  "Family-Friendly",
  "Budget",
];

const DESTINATION_COUNT = 25;

async function main() {
  console.log(`Seeding ${DESTINATION_COUNT} destinations...`);

  const destinations = Array.from({ length: DESTINATION_COUNT }).map(() => ({
    name: `${faker.location.city()}, ${faker.location.country()}`,
    baseCost: faker.number.int({ min: 300, max: 4000 }),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    tags: faker.helpers.arrayElements(TAG_POOL, { min: 2, max: 4 }),
    imageUrl: faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
  }));

  await prisma.destination.createMany({ data: destinations });

  console.log("Done seeding.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });