import { prisma } from "@/lib/prisma";
export { rateLimitKey, requestAddress } from "@/lib/rate-limit-utils";

/** Database-backed rate limits work across application instances and restarts. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  return prisma.$transaction(async (tx) => {
    await tx.rateLimitBucket.upsert({ where: { key }, create: { key, count: 0, resetAt }, update: {} });
    const reset = await tx.rateLimitBucket.updateMany({ where: { key, resetAt: { lte: now } }, data: { count: 1, resetAt } });
    const increment = reset.count ? reset : await tx.rateLimitBucket.updateMany({ where: { key, resetAt: { gt: now }, count: { lt: limit } }, data: { count: { increment: 1 } } });
    await tx.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    return increment.count === 1;
  });
}
