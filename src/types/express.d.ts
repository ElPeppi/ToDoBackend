import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: number; email?: string; name?: string };
  }
}
declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      email?: string;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};