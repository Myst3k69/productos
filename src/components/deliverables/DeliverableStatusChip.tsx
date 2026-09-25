"use client";

import * as React from "react";
import { Check, Circle, Eye } from "lucide-react";
import type { DeliverableStatus } from "@/lib/buildos/types";
import { Chip } from "@/components/ui/chip";
import { WorkingDots } from "@/components/ui/misc";
import { DELIVERABLE_STATUS_META } from "./deliverable-meta";

export function DeliverableStatusChip({ status, className }: { status: DeliverableStatus; className?: string }) {
  const meta = DELIVERABLE_STATUS_META[status];
  const icon = status === "validated" ? <Check /> : status === "to_review" ? <Eye /> : status === "todo" ? <Circle /> : null;
  return (
    <Chip tone={meta.tone} size="sm" icon={icon} className={className}>
      {status === "generating" ? <WorkingDots className="mr-0.5" /> : null}
      {meta.label}
    </Chip>
  );
}
