'use server';
/**
 * @fileOverview Flows for managing Firebase Authentication users.
 * This requires the Firebase Admin SDK.
 *
 * - listUsers - Retrieves a list of all users.
 * - createUser - Creates a new user with email and password.
 * - updateUser - Updates a user's properties (disabled, password).
 * - setUserRole - Sets a custom claim for a user's role (admin/user).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { UserRecord } from 'firebase-admin/auth';
import { FirebaseError } from 'firebase/app';
import { adminAuth } from '@/lib/firebase-admin';

// --- Zod Schemas for Input and Output ---
const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const UpdateUserInputSchema = z.object({
  uid: z.string(),
  disabled: z.boolean().optional(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .optional(),
});

const SetUserRoleInputSchema = z.object({
  uid: z.string(),
  role: z.enum(['admin', 'user']),
});

const ManagedUserSchema = z.object({
  uid: z.string(),
  email: z.string().optional(),
  disabled: z.boolean(),
  creationTime: z.string(),
  lastSignInTime: z.string().optional().nullable(),
  role: z.string().optional(),
});

export type ManagedUser = z.infer<typeof ManagedUserSchema>;

// --- Helper Functions ---
function mapUserRecordToManagedUser(user: UserRecord): ManagedUser {
  return {
    uid: user.uid,
    email: user.email,
    disabled: user.disabled,
    creationTime: user.metadata.creationTime,
    lastSignInTime: user.metadata?.lastSignInTime,
    role: (user.customClaims?.role as string) || 'user',
  };
}

function handleFirebaseError(error: unknown): never {
  if (error instanceof FirebaseError) {
    console.error(`Firebase Admin SDK Error: ${error.code}`, error.message);
    throw new Error(error.message);
  }
  console.error('An unexpected error occurred:', error);
  throw new Error('An unexpected error occurred in user management.');
}

// --- Public Wrapper Functions ---
export async function listUsers(): Promise<ManagedUser[]> {
  return listUsersFlow();
}

export async function createUser(
  input: z.infer<typeof CreateUserInputSchema>
): Promise<ManagedUser> {
  return createUserFlow(input);
}

export async function updateUser(
  input: z.infer<typeof UpdateUserInputSchema>
): Promise<{ uid: string; success: boolean }> {
  return updateUserFlow(input);
}

export async function setUserRole(
  input: z.infer<typeof SetUserRoleInputSchema>
): Promise<{ uid: string; role: string }> {
  return setUserRoleFlow(input);
}

// --- Genkit Flows ---

const listUsersFlow = ai.defineFlow(
  {
    name: 'listUsersFlow',
    outputSchema: z.array(ManagedUserSchema),
  },
  async () => {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      const listUsersResult = await adminAuth.listUsers();

      const users = listUsersResult.users.map(mapUserRecordToManagedUser);
      return users;
    } catch (error) {
      console.error('Error listing users:', error);
      handleFirebaseError(error);
    }
  }
);

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: ManagedUserSchema,
  },
  async ({ email, password }) => {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      const userRecord = await adminAuth.createUser({ email, password });
      // Set default role to 'user'
      await adminAuth.setCustomUserClaims(userRecord.uid, { role: 'user' });
      const createdUser = await adminAuth.getUser(userRecord.uid);
      return mapUserRecordToManagedUser(createdUser);
    } catch (error) {
      handleFirebaseError(error);
    }
  }
);

const updateUserFlow = ai.defineFlow(
  {
    name: 'updateUserFlow',
    inputSchema: UpdateUserInputSchema,
    outputSchema: z.object({ uid: z.string(), success: z.boolean() }),
  },
  async ({ uid, ...updateData }) => {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      await adminAuth.updateUser(uid, updateData);
      return { uid, success: true };
    } catch (error) {
      handleFirebaseError(error);
    }
  }
);

const setUserRoleFlow = ai.defineFlow(
  {
    name: 'setUserRoleFlow',
    inputSchema: SetUserRoleInputSchema,
    outputSchema: z.object({ uid: z.string(), role: z.string() }),
  },
  async ({ uid, role }) => {
    try {
      if (!adminAuth) {
        throw new Error('Firebase Admin not initialized');
      }
      await adminAuth.setCustomUserClaims(uid, { role });
      return { uid, role };
    } catch (error) {
      handleFirebaseError(error);
    }
  }
);
