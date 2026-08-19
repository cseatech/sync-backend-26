import {
  Request,
  Response,
  NextFunction,
} from "express";

declare global {
  interface Error {
    statusCode?: number;
  }
}

function notFoundHandler(
  req: Request,
  res: Response
): void {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV !== "test") {
    console.error("Unhandled error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message:
      err.message || "Internal server error",
  });
}

export {
  notFoundHandler,
  errorHandler,
};