import { prisma } from "@/lib/prisma";

export async function getAllClubs(userId?: string) {
  const where = userId ? { userId } : {};
  return prisma.club.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  });
}

export async function getClubById(id: string) {
  return prisma.club.findUnique({ where: { id } });
}

export async function getGroupedClubs(userId?: string) {
  const clubs = await getAllClubs(userId);
  return {
    eisen: clubs.filter((c) => c.typ === "eisen"),
    wedge: clubs.filter((c) => c.typ === "wedge"),
    putter: clubs.filter((c) => c.typ === "putter"),
    holz: clubs.filter((c) => c.typ === "holz"),
    hybrid: clubs.filter((c) => c.typ === "hybrid"),
  };
}
