import { StatusTag } from '@/components/StatusTag'
import type { RepairPriority, RepairStatus } from '@/types/enums'
import { REPAIR_PRIORITY_CONFIG, REPAIR_STATUS_CONFIG } from '../constants/status'

export function RepairStatusTag({ status, size }: { status: RepairStatus; size?: 'sm' | 'md' }) {
  return <StatusTag value={status} config={REPAIR_STATUS_CONFIG} size={size} />
}

export function RepairPriorityTag({ priority, size }: { priority: RepairPriority; size?: 'sm' | 'md' }) {
  return <StatusTag value={priority} config={REPAIR_PRIORITY_CONFIG} size={size} />
}
