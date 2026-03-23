import { User } from "../types";

export const isProfileComplete = (user: User | null): boolean => {
  if (!user) return false;
  
  return !!(
    user.first_name &&
    user.last_name &&
    user.profession &&
    user.account_name &&
    user.account_number &&
    user.bank_code
  );
};
