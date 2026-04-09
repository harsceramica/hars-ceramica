import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAuthCookieName,
  getExpectedCredentials,
  getSessionDurationSeconds,
} from "@/lib/auth";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const config = getExpectedCredentials();

    if (
      !safeEqual(body.username ?? "", config.username) ||
      !safeEqual(body.password ?? "", config.password)
    ) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const token = await createSessionToken(config.username);
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: getAuthCookieName(),
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: getSessionDurationSeconds(),
    });

    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
