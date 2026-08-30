import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState, type ChangeEvent } from 'react'
import { importContentPackFile } from '../domain/contentPacks/importContentPack'
import { isBuiltInContentPack } from '../domain/contentPacks/builtInContentPacks'
import { clearPersonalityAuthoringDraft } from '../domain/contentPacks/personalityAuthoring'
import {
  contentPackCategories,
  type ContentPack,
  type ContentPackDraft,
} from '../domain/contentPacks/types'
import { PersonalityCreator } from './PersonalityCreator'

export type ContentPackImportResult =
  | { readonly status: 'saved'; readonly pack: ContentPack }
  | { readonly status: 'conflict'; readonly existing: ContentPack }

interface ContentPackLibraryProps {
  readonly packs: readonly ContentPack[]
  readonly selectedId: string | null
  readonly storageNotice?: string
  readonly onBack: () => void
  readonly onSelect: (id: string | null) => Promise<void>
  readonly onImport: (draft: ContentPackDraft) => Promise<ContentPackImportResult>
  readonly onReplace: (id: string, draft: ContentPackDraft) => Promise<void>
  readonly onRename: (id: string, name: string) => Promise<ContentPack>
  readonly onDelete: (id: string) => Promise<void>
}

const totalSayings = (pack: ContentPack) =>
  contentPackCategories.reduce(
    (total, category) => total + (pack.sayings[category]?.length ?? 0),
    0,
  )

const exportPack = (pack: ContentPack) => {
  const payload = {
    ...pack.extensions,
    schemaVersion: pack.schemaVersion,
    name: pack.name,
    sayings: pack.sayings,
  }
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${pack.name
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/gu, '') || 'content-pack'}.timerpack.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ContentPackLibrary({
  packs,
  selectedId,
  storageNotice,
  onBack,
  onSelect,
  onImport,
  onReplace,
  onRename,
  onDelete,
}: ContentPackLibraryProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [inspection, setInspection] = useState<ContentPack>()
  const [renaming, setRenaming] = useState<{
    readonly pack: ContentPack
    readonly name: string
  }>()
  const [deleting, setDeleting] = useState<ContentPack>()
  const [conflict, setConflict] = useState<{
    readonly draft: ContentPackDraft
    readonly existing: ContentPack
    readonly fromCreator: boolean
  }>()
  const [copyName, setCopyName] = useState('')
  const [creating, setCreating] = useState(false)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await action()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    await run(async () => {
      const draft = await importContentPackFile(file)
      const result = await onImport(draft)
      if (result.status === 'conflict') {
        setConflict({ draft, existing: result.existing, fromCreator: false })
        setCopyName(`${draft.name} Copy`)
      }
    })
  }

  const saveCreatedPack = async (draft: ContentPackDraft): Promise<boolean> => {
    const result = await onImport(draft)
    if (result.status === 'conflict') {
      setConflict({ draft, existing: result.existing, fromCreator: true })
      setCopyName(`${draft.name} Copy`)
      setCreating(false)
      return false
    }
    return true
  }

  if (creating) {
    return (
      <PersonalityCreator
        onCancel={() => setCreating(false)}
        onSave={saveCreatedPack}
      />
    )
  }

  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 3, sm: 6 } }}>
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={onBack} sx={{ alignSelf: 'flex-start' }}>
            Workout
          </Button>
          <Stack spacing={1}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.25rem', sm: '3.25rem' } }}>
              Personality
            </Typography>
            <Typography color="text.secondary">
              Choose sayings for this workout. Packs stay on this device.
            </Typography>
          </Stack>

          {storageNotice && <Alert severity="warning">{storageNotice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              disabled={busy}
              onClick={() => setCreating(true)}
            >
              Create Personality
            </Button>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              disabled={busy}
            >
              Import file
              <input
                hidden
                type="file"
                accept=".txt,.timerpack.json,text/plain,application/json"
                onChange={(event) => void importFile(event)}
              />
            </Button>
          </Stack>

          <Stack spacing={2} aria-label="Content packs">
            <Button
              variant={selectedId === null ? 'contained' : 'outlined'}
              color={selectedId === null ? 'primary' : 'inherit'}
              onClick={() => void run(() => onSelect(null))}
              sx={{ justifyContent: 'flex-start', p: 2, textTransform: 'none' }}
            >
              <Stack sx={{ alignItems: 'flex-start' }}>
                <Typography variant="h6">None</Typography>
                <Typography variant="body2" color="text.secondary">
                  Essential timer cues only
                </Typography>
              </Stack>
            </Button>

            {packs.map((pack) => (
              <Paper key={pack.id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Button
                    color="inherit"
                    onClick={() => void run(() => onSelect(pack.id))}
                    aria-label={`Select ${pack.name}`}
                    sx={{ flex: 1, justifyContent: 'flex-start', textTransform: 'none', p: 1.5 }}
                  >
                    <Stack sx={{ alignItems: 'flex-start' }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography variant="h6">{pack.name}</Typography>
                        {isBuiltInContentPack(pack.id) && (
                          <Chip label="Built in" size="small" />
                        )}
                        {selectedId === pack.id && <Chip label="Selected" color="primary" size="small" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {totalSayings(pack)} sayings ·{' '}
                        {isBuiltInContentPack(pack.id) ? 'included with app' : 'saved on this device'}
                      </Typography>
                    </Stack>
                  </Button>
                  <IconButton aria-label={`Inspect ${pack.name}`} onClick={() => setInspection(pack)}>
                    <InfoOutlinedIcon />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      </Container>

      <Dialog open={inspection !== undefined} onClose={() => setInspection(undefined)} fullWidth>
        {inspection && (
          <>
            <DialogTitle>{inspection.name}</DialogTitle>
            <DialogContent>
              <Stack spacing={2}>
                <Typography color="text.secondary">
                  {isBuiltInContentPack(inspection.id)
                    ? 'Included with the app'
                    : 'Saved on this device'}
                </Typography>
                <Typography variant="h5">{totalSayings(inspection)} sayings</Typography>
                <Divider />
                {contentPackCategories.map((category) => (
                  <Stack key={category} direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ textTransform: 'capitalize' }}>{category.replace(/([A-Z])/gu, ' $1')}</Typography>
                    <Typography color="text.secondary">{inspection.sayings[category]?.length ?? 0}</Typography>
                  </Stack>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ flexWrap: 'wrap' }}>
              {!isBuiltInContentPack(inspection.id) && (
                <>
                  <Button
                    onClick={() => {
                      setRenaming({ pack: inspection, name: inspection.name })
                      setInspection(undefined)
                    }}
                  >
                    Rename
                  </Button>
                  <Button startIcon={<FileDownloadRoundedIcon />} onClick={() => exportPack(inspection)}>
                    Export
                  </Button>
                  <Button
                    color="error"
                    onClick={() => {
                      setDeleting(inspection)
                      setInspection(undefined)
                    }}
                  >
                    Remove
                  </Button>
                </>
              )}
              <Button onClick={() => setInspection(undefined)}>Done</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={renaming !== undefined} onClose={() => setRenaming(undefined)} fullWidth>
        <DialogTitle>Rename content pack</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            label="Pack name"
            value={renaming?.name ?? ''}
            onChange={(event) =>
              setRenaming((current) =>
                current === undefined ? undefined : { ...current, name: event.target.value },
              )
            }
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(undefined)}>Cancel</Button>
          <Button
            disabled={busy || renaming?.name.trim().length === 0}
            onClick={() =>
              void run(async () => {
                if (renaming === undefined) return
                await onRename(renaming.pack.id, renaming.name)
                setRenaming(undefined)
              })
            }
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleting !== undefined} onClose={() => setDeleting(undefined)}>
        <DialogTitle>Remove {deleting?.name}?</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>This removes the content pack from this device.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(undefined)}>Cancel</Button>
          <Button
            color="error"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!deleting) return
                await onDelete(deleting.id)
                setDeleting(undefined)
              })
            }
          >
            Remove pack
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={conflict !== undefined} onClose={() => setConflict(undefined)} fullWidth>
        <DialogTitle>Pack already exists</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <DialogContentText>
            A saved pack named {conflict?.existing.name} already exists. Nothing has been overwritten.
          </DialogContentText>
          <TextField
            fullWidth
            label="Copy name"
            value={copyName}
            onChange={(event) => setCopyName(event.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap' }}>
          <Button onClick={() => setConflict(undefined)}>Cancel</Button>
          <Button
            color="warning"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (!conflict) return
                await onReplace(conflict.existing.id, conflict.draft)
                if (conflict.fromCreator) clearPersonalityAuthoringDraft()
              })
            }
          >
            Replace existing
          </Button>
          <Button
            variant="contained"
            disabled={busy || copyName.trim().length === 0}
            onClick={() =>
              void run(async () => {
                if (!conflict) return
                const result = await onImport({ ...conflict.draft, name: copyName })
                if (result.status === 'conflict') {
                  setConflict({
                    draft: { ...conflict.draft, name: copyName },
                    existing: result.existing,
                    fromCreator: conflict.fromCreator,
                  })
                } else if (conflict.fromCreator) {
                  clearPersonalityAuthoringDraft()
                }
              })
            }
          >
            Save a copy
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
