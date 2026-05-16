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
// Rounds — real historical data imported from Excel CSV (testdata/)
// Dates converted from Excel serial numbers (epoch: Dec 30, 1899).
// Holes with no recorded score (originally "?" in the source) are omitted;
// the round is created without a RoundHole entry for those holes.
// ---------------------------------------------------------------------------

type HoleScores = number[];

const rounds: Array<{ datum: Date; turnier: boolean; scores: HoleScores; notizen?: string }> = [
  {
    datum: new Date("2025-08-19"),
    turnier: false,
    scores: [10, 10, 7, 10, 6, 6, 7, 7, 6],
    notizen: "• Erste Runde",
  },
  {
    datum: new Date("2025-08-21"),
    turnier: false,
    scores: [7, 9, 6, 11, 6, 3, 3, 12, 16],
    notizen:
      "• Viele Gute Schläge mit dem 9er Eisen (Loch 5 und 6 sogar Par)\n" +
      "• Bunker muss geübt werden. Hoch und nicht weit Rollen ist wichtig\n" +
      "• Ziel bis 01.06.2026 Handicap 36 (bei 9 Loch sind das 18 über Par)",
  },
  {
    datum: new Date("2025-08-23"),
    turnier: false,
    scores: [9, 12, 10, 10, 7, 7, 3, 8, 11],
    notizen:
      "• Abschlag ab sofort von der Herren-Teebox\n" +
      "• Üben: Driver gerade und nicht zu hoch & Länge der Eisen 7 bis 9 kontrollieren",
  },
  {
    datum: new Date("2025-08-26"),
    turnier: false,
    scores: [7, 11, 9, 14, 8, 8, 10, 7, 11],
    notizen: "• Mit Aaron lief gar nix heute. Gleich Fitting im Golfhouse",
  },
  {
    datum: new Date("2025-08-28"),
    turnier: false,
    scores: [8, 9, 3, 12, 6, 7, 6, 6, 5],
    notizen:
      "• Mit Haio ab Bahn 2 und mit neuen Schlägern\n" +
      "• Driving Range lief richtig gut zu Beginn und dann wieder schlecht\n" +
      "• Probeschwünge gut, aber ich drehe mich nicht beim eigentlichen Schlag",
  },
  {
    datum: new Date("2025-09-08"),
    turnier: false,
    scores: [8, 7, 8, 12, 6, 4, 8, 9, 6],
    notizen:
      "• Chippen und Abschläge haben gut geklappt.\n" +
      "• Elbogen am Körber und richtig Gewicht verlagern\n" +
      "• An einfachen paar 3 zu viele Schläge verhauen",
  },
  {
    datum: new Date("2025-09-13"),
    turnier: false,
    scores: [10, 8, 3, 9, 6, 4, 6, 5, 5],
    notizen: "• Sehr gute Schläge an sich\n• Bisschen Druck wegen Gewitter",
  },
  {
    datum: new Date("2025-09-14"),
    turnier: false,
    scores: [6, 8, 6, 9, 7, 6, 10, 12, 6],
  },
  {
    datum: new Date("2025-09-16"),
    turnier: false,
    scores: [8, 7, 6, 10, 3, 5, 7, 7, 7],
    notizen:
      "• So wie beim letzten mal viele Puts versaut aber: ERSTES FUCKING BIRDY HÄÄÄ\n" +
      "wobei ich mir nicht ganz sicher bin, ob der drive wirklich so weit gewesen sein kann",
  },
  {
    datum: new Date("2025-09-18"),
    turnier: false,
    scores: [11, 10, 10, 11, 10, 6, 8, 8, 7],
  },
  {
    datum: new Date("2025-09-20"),
    turnier: false,
    scores: [9, 11, 5, 11, 6, 5, 5, 8, 7],
    notizen:
      "• Ich muss wieder mehr mit Gefühl spielen. Die ersten 4 Bahnen waren wieder so gezwungen.\n" +
      "• Auch Putten muss geübt werden.\n" +
      "• Bei der Insel mit dem 9er aber dann von der Herrenbox oder weniger Schwung?\n" +
      "• Beim Letzten ist ein Pitchingwedge okay aber nicht zu viel Schwung oder auch von der Herrenbox",
  },
  {
    datum: new Date("2025-09-23"),
    turnier: false,
    scores: [6, 9, 7, 10, 3, 5, 6, 10, 7],
    notizen: "• Mit Aaron, aber der Schwung war wieder komisch",
  },
  {
    datum: new Date("2025-09-27"),
    turnier: false,
    scores: [5, 9, 9, 15, 4, 5, 7, 10, 4],
  },
  {
    datum: new Date("2025-09-29"),
    turnier: false,
    scores: [4, 10, 7, 13, 10, 5, 8, 6, 5],
    notizen:
      "• Viele Tolle Schläge mit Aaron. Bei der Insel besser nur ein Pitching. Das 9er ging über den Zaun",
  },
  {
    datum: new Date("2025-10-02"),
    turnier: false,
    scores: [9, 5, 3, 6, 10, 3, 7, 6, 4],
    notizen:
      "• Mit Aaron um 17:40 eine Abendrunde mit super geilen Schlägen und persönliche Bestleistung!!!",
  },
  {
    datum: new Date("2025-10-07"),
    turnier: false,
    scores: [6, 6, 3, 11, 6, 5, 6, 9, 7],
  },
  {
    datum: new Date("2025-10-09"),
    turnier: false,
    scores: [10, 6, 3, 6, 4, 4, 8, 5, 3],
    notizen: "• Neuer Rekord !!! Und erstes mal besser als Handicap 36!!!",
  },
  {
    datum: new Date("2025-10-10"),
    turnier: false,
    scores: [10, 5, 4, 10, 5, 5, 4, 7, 3],
  },
  {
    datum: new Date("2025-10-11"),
    turnier: false,
    scores: [7, 8, 4, 12, 8, 4, 5, 4, 4],
  },
  {
    datum: new Date("2025-10-16"),
    turnier: false,
    scores: [6, 7, 12, 12, 10, 3, 7, 10, 7],
    notizen:
      "alter ich habe keine Ahnung mehr wie man einen Ball trifft\n\n" +
      "Nach unzähligen Fehlschlägen auf der Range hat es am 20.10. wieder deutlich besser geklappt. " +
      "Grund war, dass ich Tiefer geschwungen habe und dadurch nicht overthetop kam und zu fett treffe. " +
      "Außerdem dreht sichs dadurch besser auf. Des weiteren wichtig den Ellebogen am Körper zu belassen " +
      "und das Handgelenk nicht zu früh zu entladen. Der Griff muss neutral sein bei lockerem Griff!",
  },
  {
    datum: new Date("2025-10-24"),
    turnier: false,
    scores: [7, 7, 8, 7, 6, 6, 4, 10, 6],
  },
  // --- Saisonpause ---
  {
    datum: new Date("2026-03-21"),
    turnier: false,
    scores: [7, 10, 5, 14, 9, 7, 5, 6, 6],
    notizen: "Saisoneröffnung",
  },
  {
    datum: new Date("2026-03-22"),
    turnier: false,
    scores: [5, 8, 4, 8, 7, 4, 5, 5, 5],
    notizen: "Nochmal mit Aaron bei geilem Wetter",
  },
  {
    datum: new Date("2026-04-02"),
    turnier: false,
    scores: [8, 9, 5, 10, 6, 4, 7, 8, 3],
  },
  {
    datum: new Date("2026-04-03"),
    turnier: false,
    scores: [6, 7, 5, 6, 9, 3, 3, 7, 5],
  },
  {
    datum: new Date("2026-04-11"),
    turnier: false,
    scores: [9, 5, 3, 7, 9, 4, 3, 10, 7],
    notizen: "Turnier Katzberg Masters",
  },
  {
    datum: new Date("2026-04-15"),
    turnier: false,
    scores: [6, 5, 4, 9, 7, 4, 4, 5, 4],
    notizen: "NEUER REKORD!",
  },
  {
    datum: new Date("2026-04-21"),
    turnier: false,
    scores: [8, 8, 5, 6, 8, 1, 4, 7, 8],
    notizen: "FUCKING HOLE IN ONE!!!",
  },
  {
    datum: new Date("2026-04-25"),
    turnier: false,
    scores: [7, 8, 4, 11, 7, 5, 3, 7, 4],
  },
  {
    datum: new Date("2026-04-26"),
    turnier: false,
    scores: [4, 6, 3, 8, 12, 5, 4, 9, 5],
  },
  {
    datum: new Date("2026-04-30"),
    turnier: false,
    scores: [8, 5, 5, 12, 9, 4, 3, 8, 3],
  },
  {
    datum: new Date("2026-05-01"),
    turnier: false,
    scores: [5, 6, 6, 9, 6, 3, 5, 6, 6],
  },
  {
    datum: new Date("2026-05-05"),
    turnier: false,
    scores: [5, 5, 3, 5, 7, 6, 3, 5, 4],
  },
  {
    datum: new Date("2026-05-08"),
    turnier: true,
    scores: [6, 4, 6, 8, 4, 3, 3, 4, 9],
    notizen: "Turnier gewonnen :)))))",
  },
  {
    datum: new Date("2026-05-08"),
    turnier: false,
    scores: [9, 10, 4, 6, 6, 3, 4, 8, 4],
    notizen: "Warum habe ich nur eine 2. Runde noch gemacht!?",
  },
  {
    datum: new Date("2026-05-09"),
    turnier: false,
    scores: [7, 4, 5, 8, 11, 3, 3, 6, 3],
    notizen:
      "Nach Training. Fühlt sich alles so verkehrt an. Drehen ist wichtig, damit nicht fett",
  },
  {
    datum: new Date("2026-05-12"),
    turnier: false,
    scores: [8, 5, 8, 8, 10, 4, 5, 5, 6],
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
    const holes = r.scores.map((strokes, i) => ({ holeNumber: i + 1, strokes }));

    await prisma.round.create({
      data: {
        userId,
        datum: r.datum,
        turnier: r.turnier,
        notizen: r.notizen ?? null,
        links: [],
        holes: { create: holes },
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
