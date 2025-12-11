import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handlers = toNextJsHandler(auth);

export async function GET(req: Request) {
  try {
    return await handlers.GET(req);
  } catch (error) {
    console.error("[Auth GET] ERROR:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    return await handlers.POST(req);
  } catch (error) {
    console.error("[Auth POST] ERROR:", error);
    throw error;
  }
}
