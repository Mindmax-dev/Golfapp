-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "turnier" BOOLEAN NOT NULL DEFAULT false,
    "notizen" TEXT,
    "links" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_holes" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "hole_number" INTEGER NOT NULL,
    "strokes" INTEGER NOT NULL,

    CONSTRAINT "round_holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "hersteller" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "loft" DECIMAL(4,1),
    "durchschnitts_distanz" INTEGER,
    "notizen" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "round_holes_round_id_hole_number_key" ON "round_holes"("round_id", "hole_number");

-- AddForeignKey
ALTER TABLE "round_holes" ADD CONSTRAINT "round_holes_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
