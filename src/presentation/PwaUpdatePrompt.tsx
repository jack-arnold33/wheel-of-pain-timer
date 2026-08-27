import { Alert, Button, Snackbar } from '@mui/material'
import { useRegisterSW } from 'virtual:pwa-register/react'

interface PwaUpdatePromptProps {
  readonly activationAllowed: boolean
}

export function PwaUpdatePrompt({ activationAllowed }: PwaUpdatePromptProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <Snackbar open={needRefresh} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <>
            <Button color="inherit" onClick={() => setNeedRefresh(false)}>
              Later
            </Button>
            {activationAllowed && (
              <Button color="inherit" onClick={() => void updateServiceWorker(true)}>
                Update
              </Button>
            )}
          </>
        }
      >
        {activationAllowed
          ? 'An app update is ready.'
          : 'An app update is ready and will wait until the workout ends.'}
      </Alert>
    </Snackbar>
  )
}
