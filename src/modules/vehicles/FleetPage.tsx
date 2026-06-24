import { useState } from 'react'
import { Truck, Banknote, Map as MapIcon, Archive } from 'lucide-react'
import { PageHeader } from '../../components/shared'
import { Tabs, type TabItem } from '../../components/ui'
import { useT } from '../../context/LangContext'
import { FEATURES } from '../../config/features'
import { VehiclesTab } from './tabs/VehiclesTab'
import { AccountingTab } from './tabs/AccountingTab'
import { MapTab } from './tabs/MapTab'
import { ArchiveTab } from './tabs/ArchiveTab'
import { MapComingSoon } from './MapComingSoon'

// Fleet shell: header + tabs. Each tab owns its own data fetching.
// The Map tab stays visible, but while FEATURES.fleetMap is off it shows a
// "قريباً / coming soon" placeholder instead of the real map — no map code is
// removed, so Joseph keeps working. Flip FEATURES.fleetMap to show the real map.
export function FleetPage() {
  const t = useT()
  const [tab, setTab] = useState('vehicles')

  const tabs: TabItem[] = [
    { key: 'vehicles', label: t('fleet.tab.vehicles'), icon: <Truck className="h-4 w-4" /> },
    { key: 'accounting', label: t('fleet.tab.accounting'), icon: <Banknote className="h-4 w-4" /> },
    { key: 'map', label: t('fleet.tab.map'), icon: <MapIcon className="h-4 w-4" /> },
    { key: 'archive', label: t('fleet.tab.archive'), icon: <Archive className="h-4 w-4" /> },
  ]

  return (
    <div>
      <PageHeader
        title={t('fleet.title')}
        subtitle={t('fleet.subtitle')}
        icon={<Truck className="h-5 w-5" />}
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-6" />
      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'accounting' && <AccountingTab />}
      {tab === 'map' && (FEATURES.fleetMap ? <MapTab /> : <MapComingSoon />)}
      {tab === 'archive' && <ArchiveTab />}
    </div>
  )
}
