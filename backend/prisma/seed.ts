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

async function seedGroupDestinations(groupId: string) {
  const existing = await prisma.groupDestination.count({ where: { groupId } });
  if (existing > 0) {
    console.log("Skipping group destinations — already linked.");
    return;
  }

  const firstFive = await prisma.destination.findMany({ take: 5 });
  await prisma.groupDestination.createMany({
    data: firstFive.map((d) => ({ groupId, destinationId: d.id })),
  });
  console.log(`Linked ${firstFive.length} destinations to the test group's shortlist.`);
}

async function seedDestinations() {
  const existingCount = await prisma.destination.count();
  if (existingCount > 0) {
    console.log(`Skipping destinations — ${existingCount} already exist.`);
    return;
  }

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
}

async function seedGroupWithMembers() {
  const existingGroup = await prisma.group.findFirst();
  if (existingGroup) {
    console.log(`Skipping group — one already exists (id: ${existingGroup.id}).`);
    return;
  }

  console.log("Seeding one test group with 3 members...");

  const users = await Promise.all(
    Array.from({ length: 3 }).map(() =>
      prisma.user.create({
        data: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
        },
      })
    )
  );

  const startDate = faker.date.soon({ days: 30 });
  const endDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);

  const group = await prisma.group.create({
    data: {
      name: "Test Trip Group",
      startDate,
      endDate,
      maxBudget: 2000,
      maxTravelHours: 15,
      originLatitude: 40.7128, // arbitrary placeholder origin (NYC) — swap for whatever makes sense later
      originLongitude: -74.006,
      originName: "New York, US",
    },
  });

  for (const user of users) {
    const preferences: Record<string, number> = {};
    for (const tag of TAG_POOL) {
      preferences[tag] = faker.number.int({ min: 0, max: 10 });
    }

    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
        preferences,
      },
    });
  }

  console.log(`Created group "${group.name}" — id: ${group.id}`);
  await seedGroupDestinations(group.id);
}

async function main() {
  await seedDestinations();
  await seedGroupWithMembers();
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