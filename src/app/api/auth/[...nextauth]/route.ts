// Auth.js v5 API route handler
// /api/auth/* 모든 인증 엔드포인트 (signin, signout, callback, session 등)

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
