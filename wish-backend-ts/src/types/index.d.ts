export {};

declare global {
  namespace Express {
    interface Request {
      uid: string;
      name: string;
      email: string;
      user: any;
      userObject: any;
      userCred?: {
        uid: string;
        email?: string;
        name?: string;
        user?: string;
      };
    }
  }
}
