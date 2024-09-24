import { CustomError } from "./customError";

export default class RessourceNotFoundError extends CustomError {
  private static readonly _statusCode = 404;
  private readonly _code: number;
  private readonly _logging: boolean;
  private readonly _context: { [key: string]: any };

  constructor(params?: {
    code?: number;
    message?: string;
    logging?: boolean;
    context?: { [key: string]: any };
  }) {
    const { code, message, logging } = params || {};

    super(message || "Bad request");
    this._code = code || RessourceNotFoundError._statusCode;
    this._logging = logging || true;
    this._context = params?.context || {};

    // Only because we are extending a built in class
    Object.setPrototypeOf(this, RessourceNotFoundError.prototype);
  }

  get errors() {
    return [{ message: this.message, context: this._context }];
  }

  get statusCode() {
    return this._code;
  }

  get logging() {
    return this._logging;
  }
}
