import { create } from 'zustand';

export interface ProjectEnvironment {
  id: string;
  name: string;
  key: string;
  clientApiKey: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  environments: ProjectEnvironment[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount?: number;
  projectCount?: number;
  projects?: ProjectSummary[];
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

  setAuth: (data: {
    user: UserProfile;
    organization: OrganizationSummary;
    tokens: { accessToken: string; refreshToken: string };
  }) => void;
  loadSession: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  logout: () => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  activeOrganization: null,
  organizations: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: ({ user, organization, tokens }) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('feature_os_access_token', tokens.accessToken);
      localStorage.setItem('feature_os_refresh_token', tokens.refreshToken);
    }
    set({
      user,
      activeOrganization: organization,
      organizations: [organization],
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  },

  loadSession: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('feature_os_access_token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Token expired or invalid
        localStorage.removeItem('feature_os_access_token');
        localStorage.removeItem('feature_os_refresh_token');
        set({
          user: null,
          activeOrganization: null,
          organizations: [],
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const json = await res.json();
      const userData = json.data;

      const user: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
      };

      const orgs: OrganizationSummary[] = (userData.memberships || []).map(
        (m: any) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
          projects: m.organization.projects || [],
        }),
      );

      const activeOrg = orgs[0] || null;

      set({
        user,
        organizations: orgs,
        activeOrganization: activeOrg,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  switchOrganization: (orgId: string) => {
    const org = get().organizations.find((o) => o.id === orgId);
    if (org) {
      set({ activeOrganization: org });
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('feature_os_access_token');
      localStorage.removeItem('feature_os_refresh_token');
    }
    set({
      user: null,
      activeOrganization: null,
      organizations: [],
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setError: (error: string | null) => set({ error }),
}));
