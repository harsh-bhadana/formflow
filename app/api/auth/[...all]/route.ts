import { auth } from "@/src/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Mount the GET and POST handlers for all auth routes
export const { GET, POST } = toNextJsHandler(auth);
