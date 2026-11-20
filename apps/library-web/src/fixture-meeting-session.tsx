'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readSyntheticMeetings, type SyntheticMeeting } from './fixture-meeting-storage';
import { FixtureMeetingDetail } from './fixture-meeting-forms';

export function SyntheticMeetingList({ fallback }: { fallback: SyntheticMeeting }) {
  const [meetings, setMeetings] = useState<SyntheticMeeting[]>([]);
  useEffect(() => { try { setMeetings(readSyntheticMeetings(sessionStorage) ?? []); } catch {} }, []);
  return <ul>{[...meetings, fallback].map(meeting => <li key={meeting.id}><Link href={`/meetings/${meeting.id}`}>{meeting.title}</Link></li>)}</ul>;
}
export function SyntheticMeetingDetail({ id }: { id: string }) {
  const [meeting, setMeeting] = useState<SyntheticMeeting | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { try { setMeeting(readSyntheticMeetings(sessionStorage)?.find(item => item.id === id) ?? null); } catch {} setLoaded(true); }, [id]);
  if (loaded && !meeting) notFound();
  if (!meeting) return null;
  return <FixtureMeetingDetail id={meeting.id} title={meeting.title} />;
}
