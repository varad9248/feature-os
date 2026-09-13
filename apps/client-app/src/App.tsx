import React, { useState, useMemo } from 'react';
import {
  FeatureOSClient,
  FeatureOSProvider,
  useFeatureFlag,
  FeatureGate,
  useFeatureOS,
} from '@feature-os/sdk-js';
import {
  Zap,
  Radio,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Users,
  Activity,
  Layers,
  ArrowRight,
  CreditCard,
  Flame,
  Globe,
  Tag,
} from 'lucide-react';

interface PresetUser {
  name: string;
  userId: string;
  email: string;
  country: string;
  tier: string;
  betaTester: boolean;
}

const PRESET_USERS: PresetUser[] = [
  {
    name: 'Alice (VIP Member, US)',
    userId: 'usr_alice_vip',
    email: 'alice.smith@acme.com',
    country: 'US',
    tier: 'VIP',
    betaTester: true,
  },
  {
    name: 'Bob (Beta Tester, UK)',
    userId: 'usr_bob_beta',
    email: 'bob.jones@featureos.io',
    country: 'UK',
    tier: 'PRO',
    betaTester: true,
  },
  {
    name: 'Charlie (Standard Customer, IN)',
    userId: 'usr_charlie_std',
    email: 'charlie@gmail.com',
    country: 'IN',
    tier: 'FREE',
    betaTester: false,
  },
];

// Inner Storefront component wrapped inside FeatureOSProvider
function StorefrontContent({
  apiKey,
  onMutateFlag,
  mutating,
}: {
  apiKey: string;
  onMutateFlag: (flagKey: string, nextState: boolean) => Promise<void>;
  mutating: boolean;
}) {
  const { client, isReady } = useFeatureOS();

  // Evaluate flags via the SDK hooks
  const aiCheckoutFlag = useFeatureFlag('checkout-v2-ai-recommendations', false);
  const darkModeFlag = useFeatureFlag('dark-mode-v2', true);
  const multiCurrencyFlag = useFeatureFlag('checkout-v3-multi-currency', 'usd-standard');

  const [trackedEvents, setTrackedEvents] = useState<
    Array<{ id: string; name: string; time: string; payload: any }>
  >([]);
  const [lastTrackedMsg, setLastTrackedMsg] = useState<string | null>(null);

  const handleTrackPurchase = () => {
    if (!client) return;

    const eventPayload = {
      event: 'purchase_checkout',
      revenue: 129.99,
      aiRecommendationsActive: aiCheckoutFlag.enabled,
      currencyVariant: multiCurrencyFlag.value,
      timestamp: Date.now(),
    };

    client.track('purchase_checkout', eventPayload);

    setTrackedEvents((prev) => [
      {
        id: `evt-${Date.now().toString().slice(-4)}`,
        name: 'purchase_checkout',
        time: new Date().toLocaleTimeString(),
        payload: eventPayload,
      },
      ...prev.slice(0, 9),
    ]);

    setLastTrackedMsg('Telemetry event published to Kafka -> ClickHouse OLAP!');
    setTimeout(() => setLastTrackedMsg(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Realtime SDK Diagnostic Banner */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span
              className="pulse-dot"
              style={{
                width: '0.75rem',
                height: '0.75rem',
                borderRadius: '9999px',
                backgroundColor: isReady ? '#10b981' : '#f59e0b',
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>SDK Connection: {isReady ? 'Active & Stream Connected' : 'Connecting...'}</span>
                <span className="badge badge-blue font-mono">@feature-os/sdk-js</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Transport:{' '}
                <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
                  Server-Sent Events (SSE) Delta Stream
                </span>{' '}
                | Evaluation: <span style={{ color: '#34d399', fontFamily: 'monospace' }}>Sub-1ms Memory Cache</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onMutateFlag('checkout-v2-ai-recommendations', !aiCheckoutFlag.enabled)}
              disabled={mutating}
              className="btn btn-primary"
            >
              <RefreshCw
                style={{
                  width: '0.85rem',
                  height: '0.85rem',
                  animation: mutating ? 'spin 1s linear infinite' : 'none',
                }}
              />
              Toggle AI Checkout Flag on Server
            </button>
          </div>
        </div>

        {/* Live Flag Evaluation Metrics Matrix */}
        <div className="grid-cols-4">
          <div
            style={{
              padding: '0.875rem',
              borderRadius: '0.5rem',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>checkout-v2-ai-recommendations</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.1rem', fontWeight: 700 }}>
              {aiCheckoutFlag.enabled ? (
                <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 style={{ width: '1rem', height: '1rem' }} /> TRUE (Active)
                </span>
              ) : (
                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <XCircle style={{ width: '1rem', height: '1rem' }} /> FALSE
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
              Reason: {aiCheckoutFlag.reason}
            </div>
          </div>

          <div
            style={{
              padding: '0.875rem',
              borderRadius: '0.5rem',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>dark-mode-v2</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.1rem', fontWeight: 700 }}>
              {darkModeFlag.enabled ? (
                <span style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles style={{ width: '1rem', height: '1rem' }} /> OLED Ambient
                </span>
              ) : (
                <span style={{ color: '#94a3b8' }}>Standard Theme</span>
              )}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
              Reason: {darkModeFlag.reason}
            </div>
          </div>

          <div
            style={{
              padding: '0.875rem',
              borderRadius: '0.5rem',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>checkout-v3-multi-currency</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8' }}>
              {String(multiCurrencyFlag.value)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
              Multivariate Variant
            </div>
          </div>

          <div
            style={{
              padding: '0.875rem',
              borderRadius: '0.5rem',
              background: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Telemetry Events Sent</div>
            <div style={{ marginTop: '0.4rem', fontSize: '1.1rem', fontWeight: 700, color: '#fbbf24' }}>
              {trackedEvents.length} Events
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
              ClickHouse OLAP Ingestion
            </div>
          </div>
        </div>
      </div>

      {/* Storefront Product & Checkout View */}
      <div className="grid-cols-2">
        {/* Left: Product Card with Feature Gate */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag style={{ color: '#3b82f6', width: '1.25rem', height: '1.25rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>UltraGlide Wireless Mouse Pro</h3>
            </div>
            <span className="badge badge-emerald">$89.99 USD</span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Flagship optical sensor with 32,000 DPI, ultra-lightweight magnesium alloy honeycomb
            chassis, and dual-mode 8,000Hz polling rate.
          </p>

          {/* Conditional Recommendation driven by FeatureGate */}
          <FeatureGate
            flag="checkout-v2-ai-recommendations"
            fallback={
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: '1px dashed var(--border)',
                  background: 'rgba(2, 6, 23, 0.4)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                Standard product checkout. (AI Recommendation FeatureGate is closed).
              </div>
            }
          >
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.9))',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399', fontWeight: 700, fontSize: '0.85rem' }}>
                  <Sparkles style={{ width: '1rem', height: '1rem' }} />
                  Autonomous AI Dynamic Recommendation Active
                </div>
                <span className="badge badge-emerald">20% Bundle Saved</span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                Personalized bundle suggestion: Add <strong>Glass Skates + QuickCharge Dock</strong> for only{' '}
                <span style={{ color: '#34d399', fontWeight: 700 }}>$39.99</span> (Normally $55.00).
              </div>
            </div>
          </FeatureGate>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Checkout Price</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                {aiCheckoutFlag.enabled ? '$129.98' : '$89.99'}
              </div>
            </div>

            <button onClick={handleTrackPurchase} className="btn btn-emerald">
              <CreditCard style={{ width: '0.9rem', height: '0.9rem' }} />
              Complete Checkout & Emit Telemetry
            </button>
          </div>

          {lastTrackedMsg && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 style={{ width: '1rem', height: '1rem' }} />
              {lastTrackedMsg}
            </div>
          )}
        </div>

        {/* Right: Live Telemetry Event Audit River */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity style={{ color: '#a855f7', width: '1.1rem', height: '1.1rem' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>SDK Telemetry & Event Stream</h3>
            </div>
            <span className="badge badge-purple">{trackedEvents.length} Emitted</span>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Events queued by <code className="font-mono" style={{ color: '#a855f7' }}>client.track()</code> and flushed
            asynchronously to the FeatureOS Kafka ingestion topic.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            {trackedEvents.length === 0 ? (
              <div
                style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  border: '1px dashed var(--border)',
                  borderRadius: '0.5rem',
                }}
              >
                No telemetry events fired yet. Click "Complete Checkout" above to emit an event through the SDK.
              </div>
            ) : (
              trackedEvents.map((evt) => (
                <div
                  key={evt.id}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(2, 6, 23, 0.75)',
                    border: '1px solid var(--border)',
                    fontSize: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>
                      {evt.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{evt.time}</span>
                  </div>
                  <pre
                    style={{
                      marginTop: '0.35rem',
                      fontSize: '0.65rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedUser, setSelectedUser] = useState<PresetUser>(PRESET_USERS[0]);
  const [apiKey, setApiKey] = useState('76712822-bec3-4b95-85a8-bc1c2993cb1c');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000');
  const [mutating, setMutating] = useState(false);

  // Instantiate SDK client
  const client = useMemo(() => {
    return new FeatureOSClient({
      apiKey,
      baseUrl,
      context: {
        userId: selectedUser.userId,
        email: selectedUser.email,
        country: selectedUser.country,
        custom: {
          tier: selectedUser.tier,
          betaTester: selectedUser.betaTester,
        },
      },
      enableRealtime: true,
      enableExposureTracking: true,
    });
  }, [apiKey, baseUrl, selectedUser]);

  // Directly call the Core API to trigger a feature flag state mutation,
  // then watch the SDK update live via Server-Sent Events!
  const handleMutateFlag = async (flagKey: string, nextState: boolean) => {
    setMutating(true);
    try {
      // Authenticate to management API using demo admin
      const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@featureos.io', password: 'password123' }),
      });

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.data.tokens.accessToken;
        const org = loginData.data.organization;
        const project = org.projects?.[0];

        if (project) {
          await fetch(
            `${baseUrl}/api/v1/projects/${project.id}/flags/${flagKey}/environments/development`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                isEnabled: nextState,
                rolloutPercentage: nextState ? 100 : 0,
              }),
            },
          );
        }
      }
    } catch (err) {
      console.error('Failed to mutate flag:', err);
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="container">
      {/* Top Application Header */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">F</div>
          <div>
            <div className="brand-title">Acme Electronics Storefront</div>
            <div className="brand-subtitle">
              External Client Application isolated from dashboard • Powered by{' '}
              <strong style={{ color: 'white' }}>FeatureOS JavaScript SDK</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span className="badge badge-emerald">
            <span
              style={{
                width: '0.45rem',
                height: '0.45rem',
                borderRadius: '9999px',
                backgroundColor: '#10b981',
              }}
            />
            Port 5173 (Client App)
          </span>
          <span className="badge badge-blue">API: Port 4000</span>
        </div>
      </header>

      {/* User Persona / Context Switcher */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <Users style={{ width: '1rem', height: '1rem', color: '#3b82f6' }} />
            Active User Persona & Targeting Context (Client State)
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Switch personas to test targeting rules & percentage rollouts
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {PRESET_USERS.map((user) => (
            <button
              key={user.userId}
              onClick={() => setSelectedUser(user)}
              className={`btn ${
                selectedUser.userId === user.userId ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            background: 'rgba(2, 6, 23, 0.75)',
            border: '1px solid var(--border)',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <span>User ID: <strong style={{ color: 'white' }}>{selectedUser.userId}</strong></span>
          <span>Email: <strong style={{ color: 'white' }}>{selectedUser.email}</strong></span>
          <span>Country: <strong style={{ color: 'white' }}>{selectedUser.country}</strong></span>
          <span>Tier: <strong style={{ color: 'white' }}>{selectedUser.tier}</strong></span>
          <span>Beta Tester: <strong style={{ color: 'white' }}>{String(selectedUser.betaTester)}</strong></span>
        </div>
      </div>

      {/* Wrap with real FeatureOSProvider */}
      <FeatureOSProvider client={client}>
        <StorefrontContent
          apiKey={apiKey}
          onMutateFlag={handleMutateFlag}
          mutating={mutating}
        />
      </FeatureOSProvider>
    </div>
  );
}
