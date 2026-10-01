import { mysqlConfigured, withMysql, type MysqlEnv } from "./mysql";

export type MeetingAuditEnv = MysqlEnv & { MEETING_AUDIT_TOKEN?: string };

type Occupant = { occupant_jid?: unknown; joined_at?: unknown; left_at?: unknown; name?: unknown; email?: unknown; id?: unknown };
type MeetingEvent = {
  event_name?: unknown; meeting_id?: unknown; room_name?: unknown; room_jid?: unknown;
  is_breakout?: unknown; created_at?: unknown; destroyed_at?: unknown; occupant?: Occupant;
};

const allowedEvents = new Set(["muc-room-created", "muc-room-destroyed", "muc-occupant-joined", "muc-occupant-left"]);

function text(value: unknown, max: number) { return String(value ?? "").trim().slice(0, max); }
function timestamp(value: unknown) {
  const numberValue = Number(value);
  if (Number.isFinite(numberValue) && numberValue > 0) return new Date(numberValue * 1000).toISOString();
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}
function secondsBetween(start: string, end: string) {
  return Math.max(0, Math.floor((Date.parse(end) - Date.parse(start)) / 1000));
}
function authorized(request: Request, env: MeetingAuditEnv) {
  const token = env.MEETING_AUDIT_TOKEN?.trim();
  return Boolean(token && request.headers.get("authorization") === `Bearer ${token}`);
}

export async function handleMeetingAudit(request: Request, env: MeetingAuditEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/meetings/events/")) return null;
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405 });
  if (!authorized(request, env)) return Response.json({ error: "Não autorizado." }, { status: 401 });
  if (!mysqlConfigured(env)) return Response.json({ error: "MySQL indisponível." }, { status: 503 });

  try {
    const payload = await request.json() as MeetingEvent;
    const eventName = text(payload.event_name, 64);
    const roomName = text(payload.room_name, 180);
    const roomJid = text(payload.room_jid, 255);
    const meetingId = text(payload.meeting_id, 128);
    if (!allowedEvents.has(eventName) || !roomName || !roomJid || !meetingId) {
      return Response.json({ error: "Evento de reunião inválido." }, { status: 400 });
    }

    const occurredAt = timestamp(payload.destroyed_at ?? payload.created_at ?? payload.occupant?.left_at ?? payload.occupant?.joined_at);
    const occupant = payload.occupant || {};
    const occupantJid = text(occupant.occupant_jid, 255);
    const joinedAt = timestamp(occupant.joined_at ?? occurredAt);
    const leftAt = eventName === "muc-occupant-left" ? timestamp(occupant.left_at ?? occurredAt) : null;

    await withMysql(env, async db => {
      await db.execute(
        `INSERT INTO meeting_audit_meetings (meeting_id,room_name,room_jid,started_at,last_event_at,is_breakout)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE room_name=VALUES(room_name),room_jid=VALUES(room_jid),last_event_at=VALUES(last_event_at)`,
        [meetingId, roomName, roomJid, occurredAt, occurredAt, payload.is_breakout ? 1 : 0],
      );

      if (eventName === "muc-occupant-joined" && occupantJid) {
        await db.execute(
          `INSERT IGNORE INTO meeting_audit_participants (meeting_id,occupant_jid,joined_at,participant_name,participant_email,participant_external_id)
           VALUES (?,?,?,?,?,?)`,
          [meetingId, occupantJid, joinedAt, text(occupant.name, 160) || null, text(occupant.email, 254) || null, text(occupant.id, 128) || null],
        );
      }
      if (eventName === "muc-occupant-left" && occupantJid) {
        const active = (await db.query<{ joinedAt: string }>(
          "SELECT joined_at AS joinedAt FROM meeting_audit_participants WHERE meeting_id=? AND occupant_jid=? AND left_at IS NULL ORDER BY joined_at DESC LIMIT 1",
          [meetingId, occupantJid],
        ))[0];
        await db.execute(
          `UPDATE meeting_audit_participants SET left_at=?, duration_seconds=?
           WHERE meeting_id=? AND occupant_jid=? AND left_at IS NULL`,
          [leftAt, active ? secondsBetween(active.joinedAt, leftAt!) : 0, meetingId, occupantJid],
        );
      }
      if (eventName === "muc-room-destroyed") {
        const endedAt = timestamp(payload.destroyed_at ?? occurredAt);
        const meeting = (await db.query<{ startedAt: string }>(
          "SELECT started_at AS startedAt FROM meeting_audit_meetings WHERE meeting_id=? LIMIT 1", [meetingId],
        ))[0];
        await db.execute(
          `UPDATE meeting_audit_meetings
           SET ended_at=?, duration_seconds=?, last_event_at=?
           WHERE meeting_id=?`,
          [endedAt, meeting ? secondsBetween(meeting.startedAt, endedAt) : 0, endedAt, meetingId],
        );
        const activeParticipants = await db.query<{ occupantJid: string; joinedAt: string }>(
          "SELECT occupant_jid AS occupantJid,joined_at AS joinedAt FROM meeting_audit_participants WHERE meeting_id=? AND left_at IS NULL", [meetingId],
        );
        for (const participant of activeParticipants) await db.execute(
          "UPDATE meeting_audit_participants SET left_at=?,duration_seconds=? WHERE meeting_id=? AND occupant_jid=? AND joined_at=?",
          [endedAt, secondsBetween(participant.joinedAt, endedAt), meetingId, participant.occupantJid, participant.joinedAt],
        );
      }
    });
    return Response.json({ recorded: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("meeting-audit", error instanceof Error ? error.message : error);
    return Response.json({ error: "Não foi possível registrar o evento da reunião." }, { status: 500 });
  }
}
