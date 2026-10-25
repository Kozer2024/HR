import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [Credentials({
    credentials: { fullName: {}, password: {} },
    async authorize(credentials) {
      const parsed = z.object({ fullName: z.string().trim().min(2).max(100), password: z.string().min(8) }).safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findFirst({ where: { name: { equals: parsed.data.fullName, mode: "insensitive" } } });
      if (!user || user.status !== "ACTIVE" || !(await compare(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, name: user.name, email: user.email, role: user.role };
    },
  })],
  callbacks: {
    jwt({ token, user }) { if (user) token.role = (user as { role?: string }).role; return token; },
    async session({ session, token }) { if (session.user && token.sub) { const user = await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true, name: true, email: true, role: true, status: true } }); if (!user || user.status !== "ACTIVE") return { ...session, user: undefined }; session.user.id = user.id; session.user.name = user.name; session.user.email = user.email; session.user.role = user.role; } return session; },
  },
});
