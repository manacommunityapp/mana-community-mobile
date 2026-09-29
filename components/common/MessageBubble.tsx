import React, { memo } from 'react';
import { View, Text, Image, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ChatMessageDto, ChatAttachmentDto } from '@/types/api';
import { COLORS, getInitials } from '@/constants/config';

// ── Date separator between message groups ─────────────────────
export function DateSeparator({ date }: { date: Date }) {
  let label: string;
  if (isToday(date))          label = 'Today';
  else if (isYesterday(date)) label = 'Yesterday';
  else                        label = format(date, 'MMMM d, yyyy');

  return (
    <View style={sep.row}>
      <View style={sep.line} />
      <Text style={sep.label}>{label}</Text>
      <View style={sep.line} />
    </View>
  );
}

const sep = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 },
  line:  { flex: 1, height: 1, backgroundColor: COLORS.border },
  label: { fontSize: 12, color: COLORS.textMuted, fontFamily: 'DMSans-Medium', fontWeight: '500', marginHorizontal: 10 },
});

// ── Read receipt ticks ─────────────────────────────────────────
function Ticks({ readAt }: { readAt?: string }) {
  return (
    <Text style={[tick.base, readAt ? tick.read : tick.sent]}>
      {readAt ? '✓✓' : '✓'}
    </Text>
  );
}

const tick = StyleSheet.create({
  base: { fontSize: 12, marginLeft: 4 },
  sent: { color: COLORS.textMuted },
  read: { color: '#60A5FA' },   // blue double-tick
});

// ── Avatar initials ────────────────────────────────────────────
function MiniAvatar({ name }: { name: string }) {
  return (
    <View style={av.wrap}>
      <Text style={av.text}>{getInitials(name)}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  wrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginRight: 6 },
  text: { color: '#fff', fontSize: 12, fontFamily: 'DMSans-Bold', fontWeight: '700' },
});

// ── System message ─────────────────────────────────────────────
function SystemBubble({ content }: { content: string }) {
  return (
    <View style={sys.wrap}>
      <Text style={sys.text}>{content}</Text>
    </View>
  );
}

const sys = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 4 },
  text: { fontSize: 12, color: COLORS.textMuted, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
});

// ── Attachment rendering ──────────────────────────────────────
function AttachmentList({ attachments, isMine }: { attachments: ChatAttachmentDto[]; isMine: boolean }) {
  return (
    <View style={att.container}>
      {attachments.map((a) => {
        const isImage = a.contentType.startsWith('image/');
        if (isImage) {
          return (
            <Image
              key={a.id}
              source={{ uri: a.fileUrl }}
              style={att.image}
              resizeMode="cover"
            />
          );
        }
        const sizeLabel = a.sizeBytes < 1024 * 1024
          ? `${Math.round(a.sizeBytes / 1024)} KB`
          : `${(a.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
        return (
          <TouchableOpacity
            key={a.id}
            style={att.file}
            onPress={() => Linking.openURL(a.fileUrl).catch(() => {})}
          >
            <Text style={att.fileIcon}>📄</Text>
            <View style={att.fileMeta}>
              <Text style={[att.fileName, isMine && att.fileNameMine]} numberOfLines={1}>{a.fileName}</Text>
              <Text style={[att.fileSize, isMine && att.fileSizeMine]}>{sizeLabel}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const att = StyleSheet.create({
  container:    { gap: 6, marginBottom: 4 },
  image:        { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: '#E5E7EB' },
  file:         { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10 },
  fileIcon:     { fontSize: 24 },
  fileMeta:     { flex: 1 },
  fileName:     { fontSize: 13, fontFamily: 'DMSans-Medium', fontWeight: '500', color: COLORS.text },
  fileNameMine: { color: '#fff' },
  fileSize:     { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  fileSizeMine: { color: 'rgba(255,255,255,0.7)' },
});

// ── Main MessageBubble ─────────────────────────────────────────
interface Props {
  message: ChatMessageDto;
  isMine: boolean;
  showAvatar: boolean;          // show avatar for first msg in a received group
  prevMessage?: ChatMessageDto; // used to decide if date separator is needed
}

export const MessageBubble = memo(function MessageBubble({
  message, isMine, showAvatar, prevMessage,
}: Props) {
  if (message.type === 'system') {
    return <SystemBubble content={message.content} />;
  }

  const msgDate  = new Date(message.createdAt);
  const prevDate = prevMessage ? new Date(prevMessage.createdAt) : null;
  const showSep  = !prevDate || !isSameDay(msgDate, prevDate);

  return (
    <>
      {showSep && <DateSeparator date={msgDate} />}

      <View style={[bub.row, isMine ? bub.rowMine : bub.rowTheirs]}>

        {/* Avatar on the left for received messages */}
        {!isMine && (showAvatar
          ? <MiniAvatar name={message.senderName} />
          : <View style={{ width: 34 }} />   /* spacer to keep alignment */
        )}

        <View style={[bub.bubble, isMine ? bub.mine : bub.theirs]}>
          {/* Sender name — only show in groups/when needed */}
          {!isMine && showAvatar && (
            <Text style={bub.senderName}>{message.senderName}</Text>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentList attachments={message.attachments} isMine={isMine} />
          )}

          {/* Text content — hide placeholder "[attachment]" when files are present */}
          {!(message.attachments?.length && message.content === '[attachment]') && (
            <Text style={[bub.content, isMine ? bub.contentMine : bub.contentTheirs]}>
              {message.content}
            </Text>
          )}

          <View style={bub.meta}>
            <Text style={[bub.time, isMine ? bub.timeMine : bub.timeTheirs]}>
              {format(msgDate, 'h:mm a')}
            </Text>
            {isMine && <Ticks readAt={message.readAt} />}
          </View>
        </View>
      </View>
    </>
  );
});

const bub = StyleSheet.create({
  row:          { flexDirection: 'row', marginVertical: 2, paddingHorizontal: 12, alignItems: 'flex-end' },
  rowMine:      { justifyContent: 'flex-end' },
  rowTheirs:    { justifyContent: 'flex-start' },
  bubble:       { maxWidth: '75%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  mine:         { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirs:       { backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  senderName:   { fontSize: 12, fontFamily: 'DMSans-Bold', fontWeight: '700', color: COLORS.primary, marginBottom: 3 },
  content:      { fontSize: 15, lineHeight: 21 },
  contentMine:  { color: '#fff' },
  contentTheirs:{ color: COLORS.text },
  meta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 2 },
  time:         { fontSize: 11 },
  timeMine:     { color: 'rgba(255,255,255,0.7)' },
  timeTheirs:   { color: COLORS.textMuted },
});
