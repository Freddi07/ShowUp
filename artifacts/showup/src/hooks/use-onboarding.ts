import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { OnboardingStatus } from '@/lib/onboarding';

/** Reads the signed-in user's onboarding state (cached, shared across views). */
export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: () => apiFetch<OnboardingStatus>('/api/onboarding'),
  });
}

/** Updates onboarding state and refreshes the cached status. */
export function useUpdateOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<OnboardingStatus>) =>
      apiFetch<OnboardingStatus>('/api/onboarding', {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => qc.setQueryData(['onboarding'], data),
  });
}
