import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.SEED_USER_ID) {
  console.error(
    "SEED_USER_ID is not set.\n" +
    "Get your user ID from Supabase Studio → Authentication → Users,\n" +
    "then run:  SEED_USER_ID=<uuid> npx prisma db seed"
  );
  process.exit(1);
}
const userId: string = process.env.SEED_USER_ID;

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Clubs — a realistic beginner/intermediate 9-hole bag
// ---------------------------------------------------------------------------
const clubs = [
  { typ: "holz",   hersteller: "TaylorMade", modell: "Stealth 2 Driver",    loft: 10.5, durchschnittsDistanz: 210, sortOrder: 1 },
  { typ: "holz",   hersteller: "TaylorMade", modell: "Stealth 2 3-Holz",    loft: 15.0, durchschnittsDistanz: 185, sortOrder: 2 },
  { typ: "hybrid", hersteller: "Callaway",   modell: "Apex Hybrid 4",        loft: 22.0, durchschnittsDistanz: 165, sortOrder: 3 },
  { typ: "eisen",  hersteller: "Callaway",   modell: "Apex 5-Eisen",         loft: 27.0, durchschnittsDistanz: 155, sortOrder: 4 },
  { typ: "eisen",  hersteller: "Callaway",   modell: "Apex 6-Eisen",         loft: 30.0, durchschnittsDistanz: 145, sortOrder: 5 },
  { typ: "eisen",  hersteller: "Callaway",   modell: "Apex 7-Eisen",         loft: 34.0, durchschnittsDistanz: 135, sortOrder: 6 },
  { typ: "eisen",  hersteller: "Callaway",   modell: "Apex 8-Eisen",         loft: 38.0, durchschnittsDistanz: 125, sortOrder: 7 },
  { typ: "eisen",  hersteller: "Callaway",   modell: "Apex 9-Eisen",         loft: 42.0, durchschnittsDistanz: 115, sortOrder: 8 },
  { typ: "wedge",  hersteller: "Cleveland",  modell: "RTX 6 Pitching Wedge", loft: 46.0, durchschnittsDistanz: 100, sortOrder: 9 },
  { typ: "wedge",  hersteller: "Cleveland",  modell: "RTX 6 Sand Wedge",     loft: 56.0, durchschnittsDistanz: 75,  sortOrder: 10 },
  { typ: "putter", hersteller: "Odyssey",    modell: "White Hot OG #7",      loft: null,  durchschnittsDistanz: null, sortOrder: 11 },
] satisfies Array<{
  typ: string;
  hersteller: string;
  modell: string;
  loft: number | null;
  durchschnittsDistanz: number | null;
  sortOrder: number;
}>;

// ---------------------------------------------------------------------------
// Rounds — realistic 9-hole scores (par 33: 4,4,3,5,4,3,3,4,3)
// ---------------------------------------------------------------------------
type HoleScore = [number, number, number, number, number, number, number, number, number];

const rounds: Array<{ datum: Date; turnier: boolean; scores: HoleScore; notizen?: string }> = [
  {
    datum: new Date("2026-04-05"),
    turnier: false,
    scores: [5, 6, 4, 6, 5, 4, 4, 5, 4], // 43 total, +10
  },
  {
    datum: new Date("2026-04-12"),
    turnier: false,
    scores: [5, 5, 3, 7, 5, 3, 4, 5, 4], // 41 total, +8
  },
  {
    datum: new Date("2026-04-19"),
    turnier: true,
    scores: [4, 5, 4, 6, 5, 3, 3, 5, 4], // 39 total, +6
    notizen: "Erstes Turnier der Saison",
  },
  {
    datum: new Date("2026-04-26"),
    turnier: false,
    scores: [5, 5, 3, 6, 4, 4, 3, 5, 3], // 38 total, +5
  },
  {
    datum: new Date("2026-05-03"),
    turnier: false,
    scores: [4, 5, 3, 6, 5, 3, 3, 4, 4], // 37 total, +4
  },
  {
    datum: new Date("2026-05-10"),
    turnier: false,
    scores: [4, 4, 3, 6, 4, 3, 3, 5, 3], // 35 total, +2
    notizen: "Sehr gutes Spiel am Loch 5",
  },
];

// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding database...\n");

  // Clubs
  await prisma.club.deleteMany({ where: { userId } });
  const createdClubs = await prisma.club.createMany({
    data: clubs.map((c) => ({ ...c, userId })),
  });
  console.log(`✓ ${createdClubs.count} Schläger angelegt`);

  // Rounds
  await prisma.roundHole.deleteMany({ where: { round: { userId } } });
  await prisma.round.deleteMany({ where: { userId } });

  for (const r of rounds) {
    await prisma.round.create({
      data: {
        userId,
        datum: r.datum,
        turnier: r.turnier,
        notizen: r.notizen ?? null,
        links: [],
        holes: {
          create: r.scores.map((strokes, i) => ({
            holeNumber: i + 1,
            strokes,
          })),
        },
      },
    });
  }
  console.log(`✓ ${rounds.length} Runden angelegt`);
  console.log("\nFertig.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
