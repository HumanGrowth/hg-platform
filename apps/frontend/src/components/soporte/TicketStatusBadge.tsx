import { Badge } from "@/components/ui/badge";
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_VARIANT } from "@/lib/support";
import type { SupportStatus } from "@/lib/types";

/** Estado del ticket: siempre con texto (no depende solo del color). */
export function TicketStatusBadge({ status }: { status: SupportStatus }) {
  return <Badge variant={SUPPORT_STATUS_VARIANT[status]}>{SUPPORT_STATUS_LABELS[status]}</Badge>;
}
