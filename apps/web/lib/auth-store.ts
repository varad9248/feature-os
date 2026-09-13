import { create } from 'zustand';

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount?: number;
  projectCount?: number;
  projects?: Array<{
    id: string;
    name: string;
    key: string;
    environments: Array<{
      id: string;
      name: string;
      key: string;
      clientApiKey: string;
    }>;
  }>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: UserProfile | null;
  activeOrganization: OrganizationSummary | null;
  organizations: OrganizationSummary[];
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (data: { user: UserProfile; organization: OrganizationSummary; tokens: { accessToken: string; refreshToken: string } }) => void;
  switchOrganization: (orgId: string) => void;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: {
    id: 'demo-user-id',
    email: 'admin@featureos.io',
    name: 'System Admin',
  },
  activeOrganization: {
    id: 'demo-org-id',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    role: 'OWNER',
    memberCount: 5,
    projectCount: 2,
  },
  organizations: [
    {
      id: 'demo-org-id',
      name: 'Acme Corporation',
      slug: 'acme-corp',
      role: 'OWNER',
      memberCount: 5,
      projectCount: 2,
    },
    {
      id: 'demo-org-id-2',
      name: 'Stark Enterprises',
      slug: 'stark-enterprises',
      role: 'ADMIN',
      memberCount: 12,
      projectCount: 4,
    },
  ],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: true,
  isLoading: false,
  error: null,

  setAuth: ({ user, organization, tokens }) => {
    set({
      user,
      activeOrganization: organization,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      error: null,
    });
  },

  switchOrganization: (orgId: string) => {
    const org = get().organizations.find((o) => o.id === orgId);
    if (org) {
      set({ activeOrganization: org });
    }
  },

  logout: () => {
    set({
      user: null,
      activeOrganization: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  setError: (error: string | null) => set({ error }),
}));
