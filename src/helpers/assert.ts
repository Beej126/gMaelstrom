export class Assert {
  static notEmpty<T>(value: T | undefined | null, message?: string): T {
    if (value === undefined || value === null) {
      throw new Error(message ?? "Value must not be empty");
    }
    return value;
  }
}