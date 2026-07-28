"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, MessageSquare, ListChecks, PenLine } from "lucide-react";
import { StatCard, NoteItem } from "@/components/shared";
import { Card, CardHeader, CardTitle, Button, Textarea, Timeline } from "@/components/ui";
import { getNotesStorageKey, sortNotesByLatest, type PersonalNote } from "@/lib/notesStorage";
import { useNotesStore } from "@/lib/useNotesStore";
import { useDosenSupervisedGroups } from "@/lib/useDosenSupervisedGroups";
import { useDosenProgressReports } from "@/lib/useDosenProgressReports";
import { useDosenFeedback } from "@/lib/useDosenFeedback";
import { MENTORING_MILESTONES, getMilestoneReport } from "@/lib/dosenProgressReportsStorage";
import { getUmkmFeedbackForGroup } from "@/lib/adminDashboardData";
import { getCurrentDemoUser, getActiveMahasiswaGroup } from "@/lib/demoSession";

type TimelineStatus = "selesai" | "proses" | "belum";

function reportToTimelineStatus(status: string | undefined): TimelineStatus {
  if (status === "approved") return "selesai";
  if (status === "submitted" || status === "revision_required") return "proses";
  return "belum";
}

const NOTES_MAX_LENGTH = 500;
const NOTES_PREVIEW_LIMIT = 3;

export default function MahasiswaDashboardPage() {
  const { groups, isHydrated: groupsHydrated } = useDosenSupervisedGroups();
  const { reports, isHydrated: reportsHydrated } = useDosenProgressReports();
  const { feedbacks, isHydrated: feedbackHydrated } = useDosenFeedback();
  const isHydrated = groupsHydrated && reportsHydrated && feedbackHydrated;

  const activeUser = getCurrentDemoUser("mahasiswa");
  const activeGroup = activeUser && isHydrated ? getActiveMahasiswaGroup(activeUser, groups) : undefined;

  const notesKey = getNotesStorageKey(activeUser?.name ?? "mahasiswa", activeGroup?.className ?? "-");
  const { notes, addNote, updateNote, removeNote, toggleComplete } = useNotesStore(notesKey);

  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const sortedNotes = sortNotesByLatest(notes);
  const previewNotes = sortedNotes.slice(0, NOTES_PREVIEW_LIMIT);
  const isEditing = editingId !== null;

  const handleDraftChange = (value: string) => {
    setDraft(value.slice(0, NOTES_MAX_LENGTH));
    setJustSaved(false);
  };

  const handleEditClick = (note: PersonalNote) => {
    setEditingId(note.id);
    setDraft(note.content);
    setJustSaved(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setDraft("");
    setJustSaved(false);
  };

  const handleSubmit = () => {
    const content = draft.trim();
    if (content === "") return;

    if (editingId) {
      updateNote(editingId, content);
    } else {
      addNote(content);
    }

    setDraft("");
    setEditingId(null);
    setJustSaved(true);
  };

  if (!isHydrated) {
    return null;
  }

  if (!activeGroup) {
    return (
      <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl p-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-purple/10 text-purple">
          <ListChecks size={24} strokeWidth={2} />
        </span>
        <p className="text-sm font-semibold text-navy">Anda belum terhubung dengan kelompok manapun.</p>
        <p className="text-sm text-muted">Hubungi dosen atau admin untuk ditambahkan ke sebuah kelompok.</p>
      </Card>
    );
  }

  const groupReports = reports.filter((r) => r.groupId === activeGroup.id);
  const approvedCount = groupReports.filter((r) => r.status === "approved").length;

  const dosenFeedbackCount = feedbacks.filter(
    (f) => f.groupId === activeGroup.id && f.giverRole === "dosen"
  ).length;
  const umkmFeedbackCount = getUmkmFeedbackForGroup(activeGroup.id).length;
  const totalFeedback = dosenFeedbackCount + umkmFeedbackCount;

  const trackOfProject = MENTORING_MILESTONES.map((milestone) => {
    const report = getMilestoneReport(activeGroup.id, milestone.id, reports);
    return {
      id: milestone.id,
      title: milestone.title,
      status: reportToTimelineStatus(report?.status),
    };
  });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      {/* Kolom kiri: Task, New Feedback, Track of project */}
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <StatCard
            label="Task"
            value={`${approvedCount}/${MENTORING_MILESTONES.length}`}
            icon={<ClipboardCheck size={26} strokeWidth={2} />}
            iconClassName="bg-purple/10 text-purple"
            iconSizeClassName="h-14 w-14"
            labelClassName="text-base font-semibold text-navy"
            valueClassName="mt-2 text-4xl font-bold text-purple"
            className="min-h-[140px] rounded-2xl p-6"
          />
          <StatCard
            label="New Feedback"
            value={totalFeedback}
            icon={<MessageSquare size={26} strokeWidth={2} />}
            iconClassName="bg-orange/10 text-orange"
            iconSizeClassName="h-14 w-14"
            labelClassName="text-base font-semibold text-navy"
            valueClassName="mt-2 text-4xl font-bold text-purple"
            className="min-h-[140px] rounded-2xl p-6"
          />
        </div>

        <Card className="min-w-0 rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Track of project</CardTitle>
            <Link href="/mahasiswa/project">
              <Button variant="secondary" size="sm">
                Detail
              </Button>
            </Link>
          </CardHeader>
          <div className="mt-4">
            <Timeline items={trackOfProject} />
          </div>
        </Card>
      </div>

      {/* Kolom kanan: Detail Project, Notes, Save */}
      <div className="flex min-w-0 flex-col gap-6">
        <Card className="rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Detail Project</CardTitle>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple/10 text-purple">
              <ListChecks size={18} strokeWidth={2} />
            </span>
          </CardHeader>
          <dl className="mt-4 grid grid-cols-[80px_1fr] gap-y-3 text-sm">
            <dt className="text-gray-500">Kelas</dt>
            <dd className="font-medium text-navy">: {activeGroup.className}</dd>
            <dt className="text-gray-500">Prodi</dt>
            <dd className="font-medium text-navy">: {activeGroup.studyProgram}</dd>
            <dt className="text-gray-500">Kelompok</dt>
            <dd className="font-medium text-navy">: {activeGroup.name}</dd>
            <dt className="text-gray-500">UMKM</dt>
            <dd className="font-medium text-navy">: {activeGroup.umkmName}</dd>
          </dl>
        </Card>

        <Card className="flex flex-col rounded-2xl p-6">
          <CardHeader>
            <CardTitle className="text-lg">Catatan Pribadi</CardTitle>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple/10 text-purple">
              <PenLine size={18} strokeWidth={2} />
            </span>
          </CardHeader>
          <p className="mt-1 text-xs text-muted">
            Catat hal penting, deadline, atau pekerjaan yang perlu diselesaikan.
          </p>

          <Textarea
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            maxLength={NOTES_MAX_LENGTH}
            placeholder="Contoh: Revisi target market sebelum Jumat."
            rows={4}
            className="mt-3 resize-none text-sm"
          />

          <div className="mt-2 flex items-center justify-between text-xs">
            {justSaved ? (
              <span className="font-medium text-green-600">Catatan berhasil disimpan</span>
            ) : (
              <span />
            )}
            <span className="text-muted">
              {draft.length} / {NOTES_MAX_LENGTH}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 self-end">
            {isEditing && (
              <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                Batal
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={draft.trim() === ""}
              onClick={handleSubmit}
            >
              {isEditing ? "Perbarui" : "Simpan"}
            </Button>
          </div>

          {/* Catatan Sebelumnya */}
          <div className="mt-5 border-t border-soft-gray-dark pt-4">
            <p className="text-sm font-semibold text-navy">Catatan Sebelumnya</p>

            {previewNotes.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center gap-1 py-6 text-center">
                <p className="text-sm font-semibold text-navy">Belum ada catatan</p>
                <p className="text-xs text-muted">Catatan yang disimpan akan muncul di sini.</p>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                {previewNotes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onToggleComplete={toggleComplete}
                    onDelete={removeNote}
                    onEditClick={handleEditClick}
                  />
                ))}
              </div>
            )}

            {sortedNotes.length > NOTES_PREVIEW_LIMIT && (
              <Link
                href="/mahasiswa/notes"
                className="mt-3 inline-block text-sm font-semibold text-purple hover:text-purple-dark"
              >
                Lihat semua catatan
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
