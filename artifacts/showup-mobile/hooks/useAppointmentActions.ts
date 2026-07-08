import { useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetStatsQueryKey,
  getListAppointmentsQueryKey,
  useRemindAppointment,
  useUpdateAppointment,
  type AppointmentStatus,
} from '@workspace/api-client-react';

/** Patch the status of a single appointment across every cached query. */
function patchAppointmentStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  status: AppointmentStatus,
) {
  // Dashboard list cache: { items: Appointment[] }
  queryClient.setQueryData(
    getListAppointmentsQueryKey(),
    (old: { items: Array<{ id: string; status: string }> } | undefined) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map((a) => (a.id === id ? { ...a, status } : a)),
      };
    },
  );

  // Customer detail caches: { appointments: AppointmentSummary[] }
  queryClient.setQueriesData(
    {
      predicate: (query) =>
        typeof query.queryKey[0] === 'string' &&
        query.queryKey[0].startsWith('/api/customers/'),
    },
    (old: { appointments?: Array<{ id: string; status: string }> } | undefined) => {
      if (!old?.appointments) return old;
      return {
        ...old,
        appointments: old.appointments.map((a) =>
          a.id === id ? { ...a, status } : a,
        ),
      };
    },
  );
}

/**
 * Actions a professional can take on an appointment from their phone:
 * call the customer, resend the SMS reminder, or change the status.
 * Status/reminder mutations update the React Query caches optimistically and
 * roll back on failure.
 */
export function useAppointmentActions(appointmentId: string) {
  const queryClient = useQueryClient();

  const updateMutation = useUpdateAppointment();
  const remindMutation = useRemindAppointment();

  const invalidateStats = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  }, [queryClient]);

  const setStatus = useCallback(
    (status: AppointmentStatus, onDone?: () => void) => {
      // Snapshot for rollback.
      const listSnapshot = queryClient.getQueryData(
        getListAppointmentsQueryKey(),
      );
      const customerSnapshots = queryClient.getQueriesData({
        predicate: (query) =>
          typeof query.queryKey[0] === 'string' &&
          query.queryKey[0].startsWith('/api/customers/'),
      });
      patchAppointmentStatus(queryClient, appointmentId, status);

      updateMutation.mutate(
        { id: appointmentId, data: { status } },
        {
          onSuccess: () => {
            invalidateStats();
            onDone?.();
          },
          onError: () => {
            // Roll back optimistic changes.
            queryClient.setQueryData(
              getListAppointmentsQueryKey(),
              listSnapshot,
            );
            for (const [key, data] of customerSnapshots) {
              queryClient.setQueryData(key, data);
            }
            Alert.alert('Kunne ikke oppdatere', 'Prøv igjen om litt.');
          },
        },
      );
    },
    [appointmentId, invalidateStats, queryClient, updateMutation],
  );

  const sendReminder = useCallback(
    (onDone?: () => void) => {
      remindMutation.mutate(
        { id: appointmentId, data: undefined },
        {
          onSuccess: (result) => {
            patchAppointmentStatus(queryClient, appointmentId, result.status);
            invalidateStats();
            onDone?.();
          },
          onError: () => {
            Alert.alert(
              'Kunne ikke sende påminnelse',
              'Sjekk at kunden har et telefonnummer og prøv igjen.',
            );
          },
        },
      );
    },
    [appointmentId, invalidateStats, queryClient, remindMutation],
  );

  const callCustomer = useCallback((phone: string | null | undefined) => {
    const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
    if (!cleaned) {
      Alert.alert('Mangler nummer', 'Kunden har ikke registrert telefonnummer.');
      return;
    }
    const url = `tel:${cleaned}`;
    Linking.canOpenURL(url)
      .then((ok) => {
        if (ok || Platform.OS === 'android') {
          return Linking.openURL(url);
        }
        Alert.alert('Kan ikke ringe', 'Enheten støtter ikke oppringing.');
      })
      .catch(() => {
        Alert.alert('Kan ikke ringe', 'Noe gikk galt. Prøv igjen.');
      });
  }, []);

  return {
    setStatus,
    sendReminder,
    callCustomer,
    isUpdating: updateMutation.isPending,
    isReminding: remindMutation.isPending,
  };
}
