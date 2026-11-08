export type UserRole =
  | "employee"
  | "department_manager"
  | "senior_leadership"
  | "platform_admin";

export interface AuthPrincipal {
  userId: string;
  institutionId: string;
  departmentId: string | null;
  role: UserRole;
}

export interface ProfileView {
  id: string;
  name: string;
  email: string;
  department: string | null;
  role: UserRole;
}

export interface Authenticator {
  authenticate(authorizationHeader: string | undefined): Promise<AuthPrincipal | null>;
}

export interface ProfileRepository {
  findByUserId(userId: string): Promise<ProfileView | null>;
}
