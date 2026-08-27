"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { Alert, Button, Card, Chip, Container, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useMemo, useState } from "react";

import LoadingSkeleton from "@/components/feedback/LoadingSkeleton";
import { useAuth } from "@/providers/AuthProvider";
import { useQueues } from "@/features/queues/hooks/useQueues";
import type { Queue } from "@/features/queues/model";

const EMPTY_FORM = { name: "", color: "#1976d2", description: "", isDefault: false };

export default function QueuesPage() {
  const auth = useAuth();
  const isAdmin = auth.technician?.role === "ADMIN";
  const queues = useQueues(isAdmin);
  const [editingQueue, setEditingQueue] = useState<Queue | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const title = useMemo(() => editingQueue ? `Edit ${editingQueue.name}` : "Create queue", [editingQueue]);

  if (!isAdmin) return <Container sx={{ py: 4 }}><Alert severity="error">Administrator access is required.</Alert></Container>;

  async function submit(): Promise<void> {
    const payload = {
      name: form.name,
      color: form.color,
      description: form.description.trim() || null,
      isDefault: form.isDefault,
    };
    const saved = editingQueue
      ? await queues.update(editingQueue.id, payload)
      : await queues.create(payload);
    if (saved) {
      setEditingQueue(null);
      setForm(EMPTY_FORM);
    }
  }

  function startEdit(queue: Queue): void {
    setEditingQueue(queue);
    setForm({ name: queue.name, color: queue.color, description: queue.description ?? "", isDefault: queue.isDefault });
  }

  function cancelEdit(): void {
    setEditingQueue(null);
    setForm(EMPTY_FORM);
  }

  return (
    <Container component="main" maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Queues</Typography>
          <Typography color="text.secondary">Route tickets by team, topic, or process.</Typography>
        </div>
        {queues.error && <Alert severity="error">{queues.error}</Alert>}
        <Card sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="h6">{title}</Typography>
            <TextField label="Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Color" value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} helperText="Hex color like #1976d2" sx={{ flex: 1 }} />
              <TextField label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} sx={{ flex: 2 }} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button variant={form.isDefault ? "contained" : "outlined"} onClick={() => setForm((current) => ({ ...current, isDefault: !current.isDefault }))}>{form.isDefault ? "Default queue" : "Set as default"}</Button>
              <Button variant="contained" startIcon={editingQueue ? <SaveOutlined /> : <AddOutlined />} disabled={queues.isSaving} onClick={() => void submit()}>{editingQueue ? "Save changes" : "Create queue"}</Button>
              {editingQueue && <Button onClick={cancelEdit}>Cancel</Button>}
            </Stack>
          </Stack>
        </Card>
        {queues.isLoading ? <LoadingSkeleton variant="list" /> : (
          <Stack spacing={1.5}>
            {queues.queues.map((queue) => (
              <Card key={queue.id} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Chip label={queue.name} sx={{ bgcolor: queue.color, color: "common.white" }} />
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{queue.name}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{queue.description ?? "No description"}</Typography>
                  </Stack>
                  {queue.isDefault && <Chip size="small" label="Default" />}
                  <Tooltip title="Edit queue"><IconButton onClick={() => startEdit(queue)}><EditOutlined /></IconButton></Tooltip>
                  <Tooltip title="Delete queue"><span><IconButton color="error" disabled={queues.isSaving} onClick={() => void queues.remove(queue)}><DeleteOutline /></IconButton></span></Tooltip>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
