import { Timestamp } from 'firebase/firestore';

export interface Volunteer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  tasks: string[];
  availability: string;
  submittedAt: Timestamp;
  clubId?: string;
  golfboxId?: string;
}

export interface Admin {
  uid: string;
  email: string;
  role?: string;
  linkedFromEmail?: boolean;
  clubId?: string;
  golfboxId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
