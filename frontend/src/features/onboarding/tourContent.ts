import { PARTNER_PAY_ENABLED } from '../../lib/features'

/** The customer, Keke rider and tanker driver each get guidance for their own workflow. */
export type TourAudience = 'customer' | 'keke' | 'tanker'

interface TourStep {
  title: string
  text: string
  where: string
  cue: string
  icon: 'address' | 'vehicle' | 'review' | 'code' | 'approval' | 'online' | 'pickup' | 'history'
}

/** Explain existing features only; hidden pilot features must not be advertised by the guide. */
export function tourSteps(audience: TourAudience): TourStep[] {
  if (audience === 'customer') return [
    { title: 'Start with your address', text: 'Save your delivery address and instructions. We deliver within active service areas. Verify your phone before your first order.', where: 'Saved addresses', cue: 'Your place. Your delivery instructions.', icon: 'address' },
    { title: 'Choose your delivery', text: 'Choose Keke or Tanker, then your container or tank size and quantity. Larger requests may need assistance.', where: 'Order water', cue: 'Keke or Tanker → Quantity → Address', icon: 'vehicle' },
    { title: 'Check before you order', text: 'Review the total price and delivery details. Pay cash after unloading. We’ll call to agree the delivery time; if there’s no price yet, send a request for assistance.', where: 'Review order', cue: 'Review the details. Agree the time by phone.', icon: 'review' },
    { title: 'Follow your delivery', text: 'Open My orders for progress updates. Give your delivery code to the rider or driver only after unloading is complete.', where: 'My orders', cue: 'Updates → Unloading → Delivery code', icon: 'code' },
  ]
  const vehicle = audience === 'keke' ? 'keke' : 'tanker'
  return [
    { title: 'Get ready for review', text: `Verify your phone and provide your ${vehicle} details and papers. You can take orders after the team approves your account and vehicle.`, where: audience === 'keke' ? 'Vehicle details' : 'Tanker and papers', cue: 'Verify phone → Papers → Team review', icon: 'approval' },
    { title: 'Go online when ready', text: 'Once approved, use the online switch to become available. Review the quantity and route before accepting an order.', where: 'Home', cue: 'Get ready. Go online. Review your next job.', icon: 'online' },
    { title: 'Collect the full order', text: `Follow the job to its refill station and record pickup using the checklist. Stay within your ${vehicle}’s verified load limit.`, where: 'Active delivery', cue: 'Refill station → Full load → Record pickup', icon: 'pickup' },
    { title: 'Finish with the delivery code', text: 'Record arrival and complete unloading first. Then send and verify the customer’s delivery code to complete the job.', where: 'Active delivery', cue: 'Arrive → Unload → Verify code', icon: 'code' },
    { title: 'Find your trip records', text: PARTNER_PAY_ENABLED ? 'Check your delivery history and earnings. Use Support when you need help with a job.' : 'Check your delivery history and My cash for collection and handover records. Use Support when you need help with a job.', where: 'Your account menu', cue: 'History · My cash · Support', icon: 'history' },
  ]
}
