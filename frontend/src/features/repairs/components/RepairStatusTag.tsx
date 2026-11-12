import { StatusTag } from '@/components/StatusTag'
import type { RepairPriority, RepairStatus } from '@/types/enums'
import { REPAIR_PRIORITY_CONFIG, REPAIR_STATUS_CONFIG } from '../constants/status'

export function RepairStatusTag({ status }: { status: RepairStatus }) {
  return <StatusTag value={status} config={REPAIR_STATUS_CONFIG} />
}

export function RepairPriorityTag({ priority }: { priority: RepairPriority }) {
  return <StatusTag value={priority} config={REPAIR_PRIORITY_CONFIG} />
}
