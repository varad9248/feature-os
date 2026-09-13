export interface AuditLogDto {
  id: string;
  organizationId: string;
  userId: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  hash: string;
  prevHash?: string | null;
  createdAt: string;
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalEntries: number;
  genesisHash: string;
  headHash: string;
  tamperedIndex: number | null;
  tamperedRecordId: string | null;
  tamperedReason: string | null;
  verifiedAt: string;
}

export interface IncidentMemorySearchResult {
  query: string;
  totalMatches: number;
  matches: Array<{
    id: string;
    flagKey: string;
    summary: string;
    rootCause: string | null;
    resolutionDetails: string | null;
    similarityScore: number;
    createdAt: string;
  }>;
  ragSynthesis: string;
}
