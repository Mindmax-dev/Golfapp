import { prisma } from "@/lib/prisma";

export async function getSwingVideos(userId?: string) {
  return prisma.swingVideo.findMany({
    where: userId ? { userId } : undefined,
    orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function getSwingVideoById(id: string) {
  return prisma.swingVideo.findUnique({ where: { id } });
}
