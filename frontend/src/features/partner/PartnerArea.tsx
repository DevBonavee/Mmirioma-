import { Navigate, Outlet } from 'react-router-dom'
import { ErrorScreen, LoadingScreen } from '../../components/layout/StateScreens'
import { ShellScope } from '../../components/layout/ShellScope'
import type { VehicleType } from '../../domain/partner'
import { RequireRole } from '../auth/RequireRole'
import { PARTNER_APPS, PartnerAppContext } from './partnerContext'
import { usePartnerProfile } from './queries'
import { PartnerDesktopNav } from './components/PartnerChrome'

function VehicleGate({ vehicle }: { vehicle: VehicleType }) {
  const profile = usePartnerProfile()
  if (profile.isPending) return <LoadingScreen />
  // Only a profile that never loaded blocks the app. Every step action refreshes
  // all partner queries, the profile included; when that refresh fails (the
  // connection is lost) the cached profile keeps the screen the partner is on, so
  // the step's own notice can say what happened.
  if (profile.isError && profile.data === undefined) return <ErrorScreen error={profile.error} onRetry={() => profile.refetch()} />
  const own = profile.data.vehicle.type
  // A tanker driver who opens a rider link (or the reverse) goes to their own app.
  if (own !== vehicle) return <Navigate to={PARTNER_APPS[own].base} replace />
  return (
    <PartnerAppContext.Provider value={PARTNER_APPS[vehicle]}>
      <Outlet />
    </PartnerAppContext.Provider>
  )
}

/** Layout route for the Keke (`/partner/rider`) or tanker (`/partner/driver`) app: signed-in partners only. */
export function PartnerArea({ vehicle }: { vehicle: VehicleType }) {
  return (
    <ShellScope width="partner" nav={<PartnerDesktopNav />}>
      <RequireRole role="driver">
        <VehicleGate vehicle={vehicle} />
      </RequireRole>
    </ShellScope>
  )
}

/** `/partner`: send a partner to the app for their vehicle. */
export function PartnerHomeRedirect() {
  return (
    <ShellScope width="partner">
      <RequireRole role="driver">
        <PartnerHomeRedirectInner />
      </RequireRole>
    </ShellScope>
  )
}

function PartnerHomeRedirectInner() {
  const profile = usePartnerProfile()
  if (profile.isPending) return <LoadingScreen />
  if (profile.isError) return <ErrorScreen error={profile.error} onRetry={() => profile.refetch()} />
  return <Navigate to={PARTNER_APPS[profile.data.vehicle.type].base} replace />
}
