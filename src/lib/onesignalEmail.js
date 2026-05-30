import { supabase } from './supabase';
import { clientAuth } from './supabasePersonalization';

async function sendEmail({ toEmail, subject, htmlBody, fromName }) {
  if (!toEmail || !subject || !htmlBody) {
    throw new Error('Missing required fields: toEmail, subject, htmlBody');
  }

  const callerPin = clientAuth.getCurrentClientValidated()?.pin;

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to_email: toEmail,
      subject,
      html_body: htmlBody,
      from_name: fromName || 'Intrinsic Therapeutic Solutions',
    },
    headers: callerPin ? { 'x-caller-pin': callerPin } : {},
  });

  if (error) {
    throw new Error(error.message || 'Failed to send email');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Email send failed');
  }

  return data;
}

export { sendEmail };
