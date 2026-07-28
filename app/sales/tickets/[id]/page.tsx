import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import TicketChat from "@/components/TicketChat";
import StatusUpdater from "@/app/technician/tickets/[id]/StatusUpdater";
import { markMessagesReadAction } from "@/app/actions/tickets";
import { FileText, Film, ImageIcon, File, Link2 } from "lucide-react";
import { formatDateTime, calculateWorkingTimeMs, formatWorkingTime } from "@/lib/utils";
import CustomerWhatsAppActions from "@/app/admin/tickets/[id]/CustomerWhatsAppActions";
import PickupMethodSelector from "@/components/ui/PickupMethodSelector";
import PcBuildHandover from "@/app/admin/tickets/[id]/PcBuildHandover";
import WorkingTimeDisplay from "@/app/admin/tickets/[id]/WorkingTimeDisplay";

export const metadata = { title: "Ticket Detail — HNS IT Center" };

export default async function SalesTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole("Sales", "Administrator");
  const { id } = await params;

  const ticket = await db.ticket.findFirst({
    where: {
      OR: [
        { id },
        { ticket_code: id }
      ]
    },
    include: {
      user: { select: { name: true, email: true, phone_number: true, address: true } },
      technician: { select: { name: true } },
      messages: {
        orderBy: { created_at: "asc" },
        include: { sender: { select: { name: true, role: true } } },
      },
      attachments: true,
      status_logs: {
        orderBy: { created_at: "desc" },
        take: 20,
        include: { changer: { select: { name: true } } },
      },
      warranty_detail: true,
      cleaning_detail: true,
      upgrade_details: { include: { upgrade: true } },
      pc_components: true,
      pc_build_detail: true,
      time_logs: { orderBy: { created_at: "asc" } },
    },
  });

  if (!ticket) notFound();

  // Mark messages read
  await markMessagesReadAction(id);

  const isAssignedSales = ticket.sales_id === session.userId;
  const isAssignedTechnician = ticket.technician_id === session.userId;

  const isPaused = ticket.time_logs.length > 0 && ticket.time_logs[ticket.time_logs.length - 1].event === "PAUSE";
  const isDone = ["completed", "cancelled", "rejected"].includes(ticket.status);
  const serializedTimeLogs = ticket.time_logs.map(l => ({ id: l.id, event: l.event, created_at: l.created_at.toISOString() }));

  const PROOF_PREFIXES = ["work-proof", "courier-proof", "pickup-proof", "delivery-proof", "cancel-proof"];
  const PROOF_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
    "work-proof":     { label: "Work Completion",     emoji: "✅", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    "courier-proof":  { label: "Courier Handover",    emoji: "🚚", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
    "pickup-proof":   { label: "Pickup Handover",     emoji: "🤝", color: "#0369a1", bg: "#eff6ff", border: "#bfdbfe" },
    "delivery-proof": { label: "Delivery Confirmed",  emoji: "📬", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
    "cancel-proof":   { label: "Cancellation",        emoji: "❌", color: "#be123c", bg: "#fff1f2", border: "#fecdd3" },
  };

  function getProofPrefix(url: string): string | null {
    const filename = url.split("/").pop()?.split("?")[0] ?? "";
    return PROOF_PREFIXES.find((p) => filename.startsWith(p)) ?? null;
  }

  const proofAttachments = ticket.attachments.filter((a) => getProofPrefix(a.file_url));
  const regularAttachments = ticket.attachments.filter((a) => !getProofPrefix(a.file_url));

  const historyEvents = [
    ...ticket.status_logs
      .filter(log => log.old_status !== log.new_status)
      .map(log => ({
        id: `status_${log.id}`,
        variant: log.new_status,
        isPaused: false,
        text: `Status updated to ${log.new_status.replace(/_/g, " ").toUpperCase()}`,
        userName: log.changer.name,
        date: log.created_at
      })),
    ...ticket.time_logs
      .filter(log => log.event === "PAUSE" || log.event === "RESUME")
      .map(log => ({
        id: `time_${log.id}`,
        variant: "on_progress",
        isPaused: log.event === "PAUSE",
        text: log.event === "PAUSE" ? "Work Paused" : "Work Resumed, Status updated to ON PROGRESS",
        userName: ticket.technician?.name ?? "Technician",
        date: log.created_at
      }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "1.25rem" }}>{ticket.ticket_code}</h1>
            <Badge variant={ticket.status} technicianId={ticket.technician_id} isPaused={isPaused} />
          </div>
          <p style={{ color: "var(--text-muted)", marginTop: "0.25rem", textTransform: "capitalize" }}>
            {ticket.ticket_type.replace("_", " ")} • {ticket.device_type.replace(/_/g, " ")}
          </p>
          {ticket.device_name && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.15rem", fontWeight: 500 }}>
              Device: {ticket.device_name}
            </p>
          )}
          {ticket.device_sn && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.15rem", fontWeight: 500 }}>
              SN: {ticket.device_sn}
            </p>
          )}
          {ticket.accessories && (
            <p style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginTop: "0.15rem", fontWeight: 500 }}>
              Kelengkapan: {ticket.accessories}
            </p>
          )}
          {ticket.warranty_status && (
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginTop: "0.35rem" }}>
              {ticket.warranty_status.split(", ").map(w => (
                <span key={w} style={{ fontSize: "0.7rem", background: "var(--cream)", border: "1px solid var(--border)", padding: "0.1rem 0.4rem", borderRadius: "4px", color: "var(--text-secondary)", fontWeight: 600 }}>{w}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 items-start md:items-end mt-2 md:mt-0">
          {isAssignedSales && (
            <StatusUpdater
              ticketId={ticket.id}
              currentStatus={ticket.status}
              timeLogs={ticket.time_logs}
              pickupMethod={(ticket.pickup_method as "self_pickup" | "courier" | null) ?? "self_pickup"}
              isSalesMode={true}
              ticketType={ticket.ticket_type}
            />
          )}
          {ticket.public_share_token && (
            <Link
              href={`/${ticket.created_at.toISOString().split("T")[0]}/${ticket.ticket_code}`}
              target="_blank"
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <Link2 size={16} /> Public Link
            </Link>
          )}

        </div>
      </div>

      <div className="ticket-detail-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Customer info */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>Customer Information</h3>
              {!ticket.is_for_self && (
                <span style={{ fontSize: "0.75rem", background: "var(--cream-dark)", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 600 }}>
                  For Someone Else
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4">
              {[
                ["Name", ticket.is_for_self ? ticket.user?.name : ticket.customer_name],
                ["Email", ticket.is_for_self ? ticket.user?.email : ticket.customer_email],
                ["Phone", ticket.is_for_self ? ticket.user?.phone_number : ticket.customer_phone],
                ["Address", ticket.is_for_self ? ticket.user?.address : ticket.customer_address],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 mb-1">
                    {label} {label === "Name" && !ticket.is_for_self ? "(Recipient)" : label === "Name" ? "" : "(Account)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{value}</p>
                    {label === "Phone" && value && (
                      <a href={`https://wa.me/${(value as string).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600 transition-colors" title="Chat on WhatsApp">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
262:                         </svg>
263:                       </a>
264:                     )}
265:                     {label === "Email" && value && (
266:                       <a href={`mailto:${value}`} className="text-indigo-500 hover:text-indigo-600 transition-colors" title="Send Email">
267:                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
268:                       </a>
269:                     )}
270:                   </div>
271:                 </div>
272:               ))}
273:               <PickupMethodSelector ticketId={ticket.id} initialMethod={ticket.pickup_method || "self_pickup"} ticketType={ticket.ticket_type} />
274:             </div>
275: 
276:             <CustomerWhatsAppActions 
277:               customerPhone={(ticket.is_for_self ? ticket.user?.phone_number : ticket.customer_phone) || ""}
278:               customerName={(ticket.is_for_self ? ticket.user?.name : ticket.customer_name) || "Customer"}
279:               ticketCode={ticket.ticket_code}
280:               status={ticket.status}
281:               publicLink={ticket.public_share_token ? `${ticket.created_at.toISOString().split("T")[0]}/${ticket.ticket_code}` : null}
282:             />
283:           </div>
284: 
285:           {/* Notes */}
286:           {ticket.notes && (
287:             <div className="card">
288:               <h3 style={{ marginBottom: "1rem" }}>Problem Description</h3>
289:               <div className="tiptap-content" style={{ minHeight: "unset" }} dangerouslySetInnerHTML={{ __html: ticket.notes }} />
290:             </div>
291:           )}
292: 
293:           {/* PC Components */}
294:           {ticket.pc_components.length > 0 && (
295:             <div className="card">
296:               <h3 style={{ marginBottom: "1rem" }}>PC Components</h3>
297:               <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
298:                 {ticket.pc_components.map((c) => (
299:                   <span key={c.id} className="badge badge-technician">{c.component_name}</span>
300:                 ))}
301:               </div>
302:             </div>
303:           )}
304: 
305:           {/* PC Build Handover Verification */}
306:           {ticket.ticket_type === "pc_build" && (
307:             <PcBuildHandover
308:               ticketId={ticket.id}
309:               firstBuildUrl={ticket.pc_build_detail?.first_build_url ?? null}
310:               revisionBuildUrl={ticket.pc_build_detail?.revision_build_url ?? null}
311:               status={ticket.status}
312:               userRole={session.role}
313:               isAssignedSales={isAssignedSales}
314:               isAssignedTechnician={isAssignedTechnician}
315:             />
316:           )}
317: 
318:           {/* Regular Attachments */}
319:           {regularAttachments.length > 0 && (
320:             <div className="card">
321:               <h3 style={{ marginBottom: "1rem" }}>Attachments ({regularAttachments.length})</h3>
322:               <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
323:                 {regularAttachments.map((a) => {
324:                   const filename = a.file_url.split("/").pop()?.split("?")[0] ?? "file";
325:                   const isImage = a.file_type === "image";
326:                   const isVideo = a.file_type === "video";
327:                   const isPdf   = a.file_type === "pdf";
328:                   return (
329:                     <a
330:                       key={a.id}
331:                       href={a.file_url}
332:                       target="_blank"
333:                       rel="noopener noreferrer"
334:                       title={filename}
335:                       style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem", width: isImage ? "80px" : "100px", textDecoration: "none" }}
336:                     >
337:                       <div style={{ width: isImage ? "80px" : "100px", height: "80px", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border)", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
338:                         {isImage ? (
339:                           // eslint-disable-next-line @next/next/no-img-element
340:                           <img src={a.file_url} alt={filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
341:                         ) : isVideo ? (
342:                           <Film size={28} style={{ color: "var(--primary)" }} />
343:                         ) : isPdf ? (
344:                           <FileText size={28} style={{ color: "var(--accent)" }} />
345:                         ) : (
346:                           <File size={28} style={{ color: "var(--text-muted)" }} />
347:                         )}
348:                       </div>
349:                       <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", wordBreak: "break-all", maxWidth: "100px", lineHeight: 1.3 }}>
350:                         {filename.length > 20 ? filename.slice(0, 17) + "..." : filename}
351:                       </span>
352:                     </a>
353:                   );
354:                 })}
355:               </div>
356:             </div>
357:           )}
358: 
359:           {/* Chat */}
360:           <TicketChat
361:             ticketId={ticket.id}
362:             messages={ticket.messages.map((m) => ({
363:               id: m.id,
364:               message: m.message,
365:               created_at: m.created_at.toISOString(),
366:               is_read: m.is_read,
367:               sender: { name: m.sender?.name ?? m.sender_name ?? "Anonymous", role: m.sender?.role ?? "Customer" },
368:               isOwn: m.sender_id === session.userId,
369:             }))}
370:             currentUserId={session.userId}
371:           />
372:         </div>
373: 
374:         {/* Right Sidebar Column */}
375:         <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
376:           {/* Status log */}
377:           <div className="card" style={{ alignSelf: "flex-start", width: "100%" }}>
378:             <h3 style={{ marginBottom: "1rem" }}>Status History</h3>
379:             <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
380:               {historyEvents.length === 0 ? (
381:                 <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No status changes yet</p>
382:               ) : (
383:                 historyEvents.map((event) => {
384:                   const bg = event.isPaused
385:                     ? "#fef9c3"
386:                     : event.variant === "on_progress" ? "#eff6ff"
387:                     : event.variant === "done" ? "#f0fdf4"
388:                     : event.variant === "waiting" ? "#fffbeb"
389:                     : event.variant === "cancelled" || event.variant === "rejected" ? "#fff1f2"
390:                     : event.variant === "ready_for_pickup" || event.variant === "waiting_pickup" || event.variant === "handed_to_courier" || event.variant === "delivered" || event.variant === "completed" ? "#f0fdf4"
391:                     : "#f8fafc";
392:                   const border = event.isPaused
393:                     ? "#fde68a"
394:                     : event.variant === "on_progress" ? "#bfdbfe"
395:                     : event.variant === "done" ? "#bbf7d0"
396:                     : event.variant === "waiting" ? "#fde68a"
397:                     : event.variant === "cancelled" || event.variant === "rejected" ? "#fecdd3"
398:                     : event.variant === "ready_for_pickup" || event.variant === "waiting_pickup" || event.variant === "handed_to_courier" || event.variant === "delivered" || event.variant === "completed" ? "#bbf7d0"
399:                     : "#e2e8f0";
400:                   return (
401:                     <div key={event.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: "0.5rem", padding: "0.625rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
402:                       <Badge variant={event.variant} technicianId={ticket.technician_id} isPaused={event.isPaused} />
403:                       <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--text-primary)" }}>{event.text}</div>
404:                       <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
405:                         {event.userName} • {formatDateTime(event.date)}
406:                       </div>
407:                     </div>
408:                   );
409:                 })
410:               )}
411:             </div>
412:           </div>
413: 
414:           {/* Working Time Widget */}
415:           {ticket.time_logs.length > 0 && (
416:             <WorkingTimeDisplay timeLogs={serializedTimeLogs} isDone={isDone} />
417:           )}
418: 
419:           {/* Proof Attachments — shown below working time */}
420:           {proofAttachments.length > 0 && (
421:             <div className="card" style={{ padding: "1rem 1.25rem" }}>
422:               <h3 style={{ marginBottom: "0.875rem", fontSize: "0.9375rem" }}>Proof Attachments</h3>
423:               <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
424:                 {proofAttachments.map((a) => {
425:                   const pKey = getProofPrefix(a.file_url) ?? "work-proof";
426:                   const meta = PROOF_LABELS[pKey];
427:                   const filename = a.file_url.split("/").pop()?.split("?")[0] ?? "file";
428:                   const isImage = a.file_type === "image";
429:                   const isVideo = a.file_type === "video";
430:                   return (
431:                     <a
432:                       key={a.id}
433:                       href={a.file_url}
434:                       target="_blank"
435:                       rel="noopener noreferrer"
436:                       style={{
437:                         display: "flex",
438:                         alignItems: "center",
439:                         gap: "0.75rem",
440:                         padding: "0.625rem 0.75rem",
441:                         background: meta.bg,
442:                         border: `1px solid ${meta.border}`,
443:                         borderRadius: "0.625rem",
444:                         textDecoration: "none",
445:                         transition: "opacity 0.15s",
446:                       }}
447:                     >
448:                       <div style={{ width: "52px", height: "52px", borderRadius: "0.375rem", overflow: "hidden", flexShrink: 0, background: "rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
449:                         {isImage ? (
450:                           // eslint-disable-next-line @next/next/no-img-element
451:                           <img src={a.file_url} alt={filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
452:                         ) : isVideo ? (
453:                           <Film size={22} style={{ color: meta.color }} />
454:                         ) : (
455:                           <FileText size={22} style={{ color: meta.color }} />
456:                         )}
457:                       </div>
458:                       <div style={{ minWidth: 0, flex: 1 }}>
459:                         <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: meta.color, color: "white", borderRadius: "999px", padding: "0.1rem 0.5rem", fontSize: "0.68rem", fontWeight: 700, marginBottom: "0.25rem", letterSpacing: "0.02em" }}>
460:                           {meta.emoji} {meta.label}
461:                         </div>
462:                         <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
463:                           {filename.length > 36 ? filename.slice(0, 33) + "..." : filename}
464:                         </div>
465:                       </div>
466:                     </a>
467:                   );
468:                 })}
469:               </div>
470:             </div>
471:           )}
472:         </div>
473:       </div>
474:     </div>
475:   );
476: }
