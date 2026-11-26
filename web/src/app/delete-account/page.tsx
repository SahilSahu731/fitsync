import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";
import { supportEmail } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "Delete your FitSync account in the app, on the web, or request deletion by email without reinstalling the app.",
};

export default function DeleteAccountPage() {
  return (
    <LegalDocument
      title="Delete your FitSync account"
      introduction="You can delete your account and its associated FitSync data in the app, through your web account, or by contacting us. You do not need to reinstall the app to make a request."
    >
      <section>
        <h2>Delete in FitSync</h2>
        <p>
          In the Android app, open Settings → Delete account, type DELETE and confirm. On the web,
          open <Link href="/user/settings">Account settings</Link> or{" "}
          <Link href="/login?next=/user/settings">sign in to account settings</Link>. Under Delete
          your account, type DELETE and choose Delete permanently. You need an internet connection.
          Deletion cannot be undone.
        </p>
      </section>
      <section>
        <h2>Request deletion without the app</h2>
        <p>
          Email{" "}
          <a href={`mailto:${supportEmail}?subject=FitSync%20account%20deletion`}>{supportEmail}</a>{" "}
          with the subject “FitSync account deletion” from the email address used for Google
          sign-in. Tell us whether you want your entire account deleted or help removing particular
          data. We may ask you to verify ownership before deleting information. Do not send
          passwords, sign-in codes, payment details or health records.
        </p>
      </section>
      <section>
        <h2>What is removed</h2>
        <p>
          Account deletion removes your FitSync account, profile, sessions, saved settings,
          workouts, plans, progress and imported health entries, synced nutrition totals and meal
          plans, companion records, push registrations, sharing records, and owned avatar and
          private progress-photo files from active FitSync storage.
        </p>
        <p>
          Food diary entries and saved foods live on your Android device. Deleting your account in
          the app clears its food diary on that device. If you delete your account on the web, clear
          FitSync’s app storage on any device where you also want to remove local data.
        </p>
        <p>
          Your Google account, original Health Connect records, Google Play purchase history,
          exported files and copies already shared with others are kept outside FitSync. Provider
          backups, security records and transaction records that must be kept may remain under the
          relevant provider’s retention obligations. Contact us for assistance with these records
          and retention details.
        </p>
      </section>
      <section>
        <h2>Cancel subscriptions separately</h2>
        <p>
          Deleting your account or uninstalling FitSync does not cancel a subscription. Manage or
          cancel renewal in Google Play if you want to stop future charges. You can request account
          deletion whether or not you have an active subscription.
        </p>
      </section>
    </LegalDocument>
  );
}
