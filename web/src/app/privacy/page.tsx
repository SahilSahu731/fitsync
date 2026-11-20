import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";
import { legalOperator } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How FitSync handles account, fitness, Health Connect and purchase information, and how to control or delete your data.",
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      introduction={`This policy explains how ${legalOperator} handles information when you use the FitSync mobile app and website. Optional permissions and sharing features are under your control.`}
    >
      <section>
        <h2>Information you provide</h2>
        <ul>
          <li>
            Account information from Google sign-in: your Google account identifier, email address,
            name and profile image, together with your FitSync profile and sign-in sessions.
          </li>
          <li>
            Fitness information you choose to save: workouts, exercises, training plans, goals, body
            measurements, progress entries, sleep and activity records, nutrition and meal entries,
            preferences, notes and check-ins.
          </li>
          <li>
            Images you choose to upload, including your avatar and private progress photos. Reports
            or images you export may also be saved on your device or shared through apps you select.
          </li>
          <li>
            Support information you send us and purchase or entitlement information needed to
            provide Pro access, such as product identifiers, transaction status and your FitSync
            account identifier.
          </li>
        </ul>
      </section>
      <section id="health-connect">
        <h2>Health Connect and Apple Health</h2>
        <p>
          Health import is optional and off until you enable it. With your permission, FitSync reads
          steps, sleep and body weight from Health Connect on Android or Apple Health on supported
          iOS builds. It requests read access only and does not write records to these services.
        </p>
        <p>
          Imports cover the last seven days. FitSync derives daily step totals, sleep duration
          grouped by wake date, and the latest weight for each day. These entries are saved in your
          FitSync progress journal and uploaded to your account on our server for cloud sync,
          progress views and the fitness features you use. Import checks run while you use the app
          or return it to the foreground; FitSync does not request background health access.
        </p>
        <p>
          You can grant only selected data types, decline access, stop imports in FitSync, or revoke
          permissions in your device’s Health Connect or Apple Health settings. Revoking access
          stops future reads. It does not remove records already imported into FitSync or delete the
          original records held by your health provider. Edit or delete saved progress entries, or
          delete your FitSync account, to remove imported information from FitSync.
        </p>
        <p>
          We do not sell health data or use Health Connect or Apple Health data for advertising,
          marketing profiles, credit decisions or insurance decisions. Health data is used to
          provide your requested health and fitness features. We do not provide it to advertising
          networks or data brokers.
        </p>
      </section>
      <section>
        <h2>Other optional device access</h2>
        <p>
          Photo access lets you select images to upload. Motion access supports walks you choose to
          record. Calendar access lets you add training sessions you choose to your device calendar.
          Notification access enables reminders. Program reminders register a push token,
          installation information, session association, timezone and reminder preferences so that
          notifications can reach the correct device. You can disable notifications in FitSync or
          your device settings.
        </p>
      </section>
      <section>
        <h2>How information is used and shared</h2>
        <p>
          We use information to authenticate you, save and sync your records, provide training and
          progress features, verify subscriptions, deliver requested reminders, respond to support
          requests, and protect and operate the service.
        </p>
        <ul>
          <li>
            Google provides sign-in. Supabase hosts application data and file storage, including
            private progress photos and uploaded avatars. Cloudinary delivers exercise demonstration
            media uploaded to the exercise catalog.
          </li>
          <li>
            RevenueCat and the applicable app store handle purchase verification and subscription
            entitlements. Store payments are handled by the store; FitSync does not collect your
            payment card number.
          </li>
          <li>
            Expo and the device’s push provider deliver program notifications. Notification text may
            be visible on your lock screen, depending on your device settings.
          </li>
          <li>
            Our hosting providers process network and operational information, such as IP addresses,
            to deliver and protect the service. When enabled, Sentry receives fixed error
            categories, code file names, line numbers and release information. Our error reporter
            excludes account identifiers, request content, health records and error message text.
          </li>
        </ul>
        <p>
          When you enable a sharing feature, the people you share with can see the information you
          select. Accountability partners receive the limited commitment summary shown by that
          feature. People with a coach or report link may view the selected material until you
          revoke the link or it expires. Downloads, screenshots and copies already made by
          recipients cannot be recalled.
        </p>
        <p>
          Providers may process information in countries other than yours under their applicable
          terms and safeguards. We may also disclose information when legally required or necessary
          to protect users and the service. We do not sell your personal information.
        </p>
      </section>
      <section>
        <h2>Storage, security and retention</h2>
        <p>
          We use HTTPS for production network traffic, authenticated access controls and private
          storage for progress photos. Web sign-in uses HttpOnly session cookies. Mobile credentials
          use the device’s secure credential storage. Some preferences, cached records and pending
          edits remain on your device so app features can work between connections. No system can
          guarantee absolute security.
        </p>
        <p>
          Account records are kept while your account is active unless you remove them. Deleting
          your account removes its application records and owned avatar and private progress-photo
          files from active FitSync storage. Provider backups, security records and legally required
          transaction records may remain under the relevant provider’s retention obligations;
          deleting FitSync does not delete your Google account or the store’s purchase history.
          Contact us for help with provider-held records or a specific retention question.
        </p>
      </section>
      <section>
        <h2>Your choices and requests</h2>
        <p>
          You can update your profile, edit or delete saved entries, revoke sharing links,
          disconnect health imports and disable reminders. You can request access, correction, a
          copy of your data or deletion by contacting us. We may verify account ownership before
          acting on a request. Rights available to you depend on your location.
        </p>
        <p>
          Use Settings → Delete account in the mobile app, or follow the{" "}
          <Link href="/delete-account">web account deletion instructions</Link>. Uninstalling the
          app does not delete your cloud account. Deleting an account does not cancel a store
          subscription; cancel renewal separately through your store.
        </p>
      </section>
      <section>
        <h2>Children and policy changes</h2>
        <p>
          FitSync is not directed to children. If you believe a child has provided personal
          information without appropriate authorization, contact us so we can investigate and remove
          it where required.
        </p>
        <p>
          We update this policy when our practices change and revise the date above. Material
          changes will be communicated through the app, website or another appropriate channel. New
          optional permissions still require your choice.
        </p>
      </section>
    </LegalDocument>
  );
}
