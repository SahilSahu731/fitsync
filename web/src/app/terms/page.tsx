import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";
import { legalOperator } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using FitSync, including accounts, fitness information and optional Pro subscriptions.",
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      introduction={`These terms govern your use of the FitSync app and website provided by ${legalOperator}. By using FitSync, you agree to these terms. If you do not agree, stop using the service.`}
    >
      <section>
        <h2>Your account</h2>
        <p>
          Use an account you are authorized to use, provide accurate information and protect access
          to your Google account and devices. You are responsible for activity you authorize through
          your account. Contact us if you suspect unauthorized access. You must be able to enter
          into these terms under the laws that apply to you, or have the necessary permission from a
          parent or guardian.
        </p>
      </section>
      <section>
        <h2>Fitness information and your safety</h2>
        <p>
          FitSync provides general fitness, training and nutrition information and tools for
          recording your activity. Plans, coaching suggestions, calculations and device imports may
          be incomplete or inaccurate. They are not medical advice, diagnosis, treatment or an
          emergency service. FitSync is not a medical device. Consult a healthcare professional for
          medical advice, diagnosis or treatment, and stop activity if you experience pain or
          concerning symptoms.
        </p>
      </section>
      <section>
        <h2>Your content and permissions</h2>
        <p>
          You retain ownership of the content you submit. You give FitSync permission to store,
          process and display it as needed to operate the features you request, including sync and
          sharing you enable. Only upload material you have the right to use. You choose which
          photos to upload and which calendar events to save. Optional health, motion and
          notification permissions can be managed through the app and device settings.
        </p>
        <p>
          You are responsible for choosing recipients and the information included in shared links,
          reports and exports. Revoke links when access is no longer needed. Copies already obtained
          by recipients remain outside FitSync’s control.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not access another person’s account without permission, bypass security or paid access
          controls, disrupt the service, distribute malicious code, harass others, or upload
          unlawful or infringing content. FitSync’s software, branding and supplied catalog content
          remain the property of their respective owners. Your access to the service does not
          transfer those rights.
        </p>
      </section>
      <section>
        <h2>Free features and Pro purchases</h2>
        <p>
          FitSync offers free features and optional paid Pro access. Available products, localized
          prices, billing periods and any introductory offer are displayed before purchase and
          confirmed by your app store. Some offers may be one-time purchases; recurring
          subscriptions renew under the terms shown by the store unless renewal is cancelled before
          the applicable deadline.
        </p>
        <p>
          Your store account is charged by the store. Manage or cancel renewal in that store’s
          subscription settings. Uninstalling FitSync, signing out or deleting your FitSync account
          does not itself cancel a store subscription. Refunds and purchase disputes are handled
          under applicable law and the store’s rules. Restore eligible purchases using the account
          associated with the purchase.
        </p>
        <p>
          Pro access depends on verified entitlement status. It may change after expiry, refund,
          revocation or a store account change. A one-time or lifetime offer, when available, grants
          access to the covered Pro features for the supported life of that offering; it is not a
          promise that the service will operate forever. Mandatory consumer rights continue to
          apply.
        </p>
      </section>
      <section>
        <h2>Availability, changes and termination</h2>
        <p>
          We work to keep FitSync available, but outages, maintenance and third-party failures can
          affect access, sync, reminders and purchase verification. Keep copies of information you
          need independently. Features may evolve. Material changes affecting paid access will be
          communicated as appropriate and handled in accordance with applicable law and store rules.
        </p>
        <p>
          We may restrict access to address misuse, security threats or legal requirements. You may
          stop using FitSync at any time and <Link href="/delete-account">delete your account</Link>
          . Account deletion is permanent and does not cancel a store subscription.
        </p>
      </section>
      <section>
        <h2>Privacy</h2>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how FitSync handles account
          information, fitness and health records, optional permissions, service providers and
          deletion requests. The <Link href="/health-connect">Health Connect terms</Link> explain
          Android import permissions and how to withdraw access.
        </p>
      </section>
      <section>
        <h2>Responsibility and consumer rights</h2>
        <p>
          To the extent permitted by applicable law, FitSync is provided as available without a
          guarantee of uninterrupted operation, a particular training result or complete accuracy of
          user-entered or imported data. Nothing in these terms excludes liability that cannot
          lawfully be excluded or limits your mandatory consumer rights, including rights concerning
          paid services.
        </p>
      </section>
      <section>
        <h2>Changes to these terms</h2>
        <p>
          We may update these terms and will revise the date above. We will communicate material
          changes through the app, website or another appropriate channel. If you do not accept
          revised terms, stop using the service and manage any subscription through your store.
          Changes do not remove rights you already have under applicable law.
        </p>
      </section>
    </LegalDocument>
  );
}
