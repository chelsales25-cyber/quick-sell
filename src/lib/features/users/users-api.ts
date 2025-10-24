import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import {
  listUsers,
  createUser,
  updateUser,
  setUserRole,
  type ManagedUser,
} from '@/ai/flows/user-management-flow';

// Define types for mutation arguments
interface CreateUserArg {
  email: string;
  password?: string;
}

interface UpdateUserArg {
  uid: string;
  disabled?: boolean;
  password?: string;
}

interface SetUserRoleArg {
  uid: string;
  role: 'admin' | 'user';
}

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Users'],
  endpoints: (builder) => ({
    listUsers: builder.query<ManagedUser[], void>({
      async queryFn() {
        try {
          const users = await listUsers();
          return { data: users };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      providesTags: ['Users'],
    }),

    createUser: builder.mutation<ManagedUser, CreateUserArg>({
      async queryFn(newUser) {
        try {
          if (!newUser.password) {
            throw new Error('Password is required');
          }
          const user = await createUser({
            email: newUser.email,
            password: newUser.password,
          });
          return { data: user };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: ['Users'],
    }),

    updateUser: builder.mutation<
      { uid: string; success: boolean },
      UpdateUserArg
    >({
      async queryFn(updateData) {
        try {
          const result = await updateUser(updateData);
          return { data: result };
        } catch (error: any) {
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (result, error, { uid }) => [{ type: 'Users', id: uid }],
    }),

    setUserRole: builder.mutation<{ uid: string; role: string }, SetUserRoleArg>(
      {
        async queryFn({ uid, role }) {
          try {
            const result = await setUserRole({ uid, role });
            return { data: result };
          } catch (error: any) {
            return { error: { status: 'CUSTOM_ERROR', error: error.message } };
          }
        },
        invalidatesTags: (result, error, { uid }) => [
          { type: 'Users', id: uid },
        ],
      }
    ),
  }),
});

export const {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserRoleMutation,
} = usersApi;
