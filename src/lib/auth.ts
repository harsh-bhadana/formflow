import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { organization } from "better-auth/plugins";
import { rawDb } from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(rawDb),
  emailAndPassword: {
    enabled: true, // Native email/password authentication support
  },
  plugins: [
    organization(), // Natively supports workspace creation, organization switching, invites, and RBAC
  ],
});
