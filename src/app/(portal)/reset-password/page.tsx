import type { Metadata } from 'next';
import Link from 'next/link';
import { PortalFrame } from '@/components/site/PortalFrame';
import { ResetPasswordForm } from '@/components/forms/AuthForms';

export const metadata: Metadata = {
  title: 'Choose a new password',
  description: 'Set a new password for your Hatsi360 account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <PortalFrame
      title="Choose a new password"
      lede="Open this page from the link in your reset email so we can verify the request."
      footer={
        <Link href="/forgot-password" className="font-semibold text-brand-700 hover:text-brand-800">
          Request a new reset link
        </Link>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-ink-600">
        Set a new password using the one-time recovery link sent to your email.
      </p>
      <ResetPasswordForm />
      <p className="mt-5 text-sm leading-relaxed text-ink-600">
        If the link has expired,{' '}
        <Link href="/forgot-password" className="font-semibold text-brand-700 underline">
          request a new reset link
        </Link>.
      </p>
    </PortalFrame>
  );
}
