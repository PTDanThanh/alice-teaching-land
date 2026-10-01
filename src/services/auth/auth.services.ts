import connectToDatabase from '@/lib/mongodb';
import UserModel, { type UserDocument } from '@/src/models/auth/user.model';

export type AuthUserSummary = Pick<UserDocument, 'email' | 'fullName' | 'role'> & {
  id: string;
};

export async function findUserByEmail(email: string): Promise<AuthUserSummary | null> {
  await connectToDatabase();

  const user = await UserModel.findOne({ email }).lean<AuthUserSummary>().exec();
  return user;
}
