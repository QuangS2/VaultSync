import { useState, useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { VaultOnboardingModal } from './components/auth/VaultOnboardingModal';
import { VaultUnlockScreen } from './components/auth/VaultUnlockScreen';
import { VaultAuthEngine } from './lib/auth/vault-auth-engine';
import { UnlockedVaultSession, EncryptedVaultRecord } from './lib/auth/types';

export type AppTheme = 'sun' | 'cloud' | 'night';

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vaultsync_theme') as AppTheme;
      if (saved === 'sun' || saved === 'cloud' || saved === 'night') return saved;
    }
    return 'sun'; // Default to warm cream Sun mode
  });

  const [session, setSession] = useState<UnlockedVaultSession | null>(null);
  const [savedRecord, setSavedRecord] = useState<EncryptedVaultRecord | null>(null);
  const [isCreatingNewVault, setIsCreatingNewVault] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Apply data-theme attribute to document root
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vaultsync_theme', theme);
  }, [theme]);

  // Check for existing vault on initial load
  useEffect(() => {
    async function checkExistingVault() {
      try {
        const record = await VaultAuthEngine.getSavedVaultRecord();
        if (record) {
          setSavedRecord(record);
        } else {
          // No vault on device -> Trigger Onboarding
          setIsCreatingNewVault(true);
        }
      } catch (err) {
        console.error('Error checking saved vault:', err);
        setIsCreatingNewVault(true);
      } finally {
        setIsInitialized(true);
      }
    }
    checkExistingVault();
  }, []);

  const handleVaultCreated = async (newSession: UnlockedVaultSession) => {
    setSession(newSession);
    const rec = await VaultAuthEngine.getSavedVaultRecord();
    setSavedRecord(rec);
    setIsCreatingNewVault(false);
  };

  const handleVaultUnlocked = (unlockedSession: UnlockedVaultSession) => {
    setSession(unlockedSession);
  };

  const handleLockVault = () => {
    setSession(null);
  };

  // Loading state while checking localStorage / IndexedDB
  if (!isInitialized) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-theme-bg text-theme-text font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin" />
          <span className="text-xs text-theme-text-muted">Đang khởi tạo môi trường bảo mật...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Gateway: Show Onboarding (Registration) or Unlock Screen (Login)
  if (!session) {
    if (isCreatingNewVault || !savedRecord) {
      return (
        <VaultOnboardingModal
          isOpen={true}
          isFullScreen={true}
          theme={theme}
          onThemeChange={setTheme}
          onVaultCreated={handleVaultCreated}
          onClose={savedRecord ? () => setIsCreatingNewVault(false) : undefined}
        />
      );
    }

    return (
      <VaultUnlockScreen
        theme={theme}
        onThemeChange={setTheme}
        record={savedRecord}
        onUnlocked={handleVaultUnlocked}
        onCreateNewVault={() => setIsCreatingNewVault(true)}
      />
    );
  }

  // 2. Authenticated Session: Mount Main Workspace Canvas
  return (
    <MainLayout
      theme={theme}
      onThemeChange={setTheme}
      session={session}
      onLockVault={handleLockVault}
    />
  );
}
