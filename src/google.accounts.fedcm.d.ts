// Extend Google PromptMomentNotification type to include FedCM .momentType
// hopefully the @types/google.accounts package will eventually upgrade to include this

declare global {
  namespace google.accounts.id {
    interface PromptMomentNotification {
      momentType: 'display' | 'skipped' | 'dismissed' | 'not_displayed' | string;
    }
  }
}

export {}; // Ensures this file is treated as a module
