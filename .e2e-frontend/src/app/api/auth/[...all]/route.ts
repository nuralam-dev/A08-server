import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export async function GET(request: Request) {
  return toNextJsHandler(getAuth().auth).GET(request);
}

export async function POST(request: Request) {
  return toNextJsHandler(getAuth().auth).POST(request);
}
