import type { Metadata } from 'next';
import Link from 'next/link';
import { PortalFrame } from '@/components/site/PortalFrame';
<<<<<<< HEAD
import { ResetPasswordForm } from '@/components/forms/AuthForms';
=======
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2

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
<<<<<<< HEAD
      <p className="mb-5 text-sm leading-relaxed text-ink-600">
        Set a new password using the one-time recovery link sent to your email.
      </p>
      <ResetPasswordForm />
      <p className="mt-5 text-sm leading-relaxed text-ink-600">
        If the link has expired,{' '}
        <Link href="/forgot-password" className="font-semibold text-brand-700 underline">
          request a new reset link
        </Link>.
=======
      <p className="text-sm leading-relaxed text-ink-600">
        Password reset is handled by our authentication provider. Open the link in the reset email on
        this device and you will be returned here to set a new password.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ink-600">
        If the link has expired, request a new one from the{' '}
        <Link href="/forgot-password" className="font-semibold text-brand-700 underline">
          forgot password
        </Link>{' '}
        page.
>>>>>>> b1d2c0d621d9dba5e8a1581c409af2072300d1f2
      </p>
    </PortalFrame>
  );
}
