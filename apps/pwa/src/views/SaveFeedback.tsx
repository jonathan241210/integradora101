import { Alert } from '@arca/ui';

type SaveFeedbackProps = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string;
};

export function SaveFeedback({ status, message }: SaveFeedbackProps) {
  if (status === 'idle' || status === 'saving' || !message) return null;

  return (
    <Alert className="no-print" role={status === 'error' ? 'alert' : 'status'}>
      {message}
    </Alert>
  );
}
