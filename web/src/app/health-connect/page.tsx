import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Health Connect terms and permissions",
  description:
    "See which Health Connect permissions FitSync requests on Android, where imported data goes, and how to stop imports or delete your records.",
};

export default function HealthConnectPage() {
  return (
    <LegalDocument
      title="Health Connect terms and permissions"
      introduction="Connecting Health Connect on Android is optional. You choose which readings FitSync can import into your progress journal. You can also enter measurements yourself."
    >
      <section>
        <h2>What each permission does</h2>
        <ul>
          <li>
            <strong>Steps.</strong> FitSync reads daily step totals so you can follow your activity.
            Extra steps you add by hand are kept separately from the imported total.
          </li>
          <li>
            <strong>Sleep.</strong> FitSync uses recorded sleep stages to calculate hours asleep for
            the day you woke up. That daily duration appears in your recovery history.
          </li>
          <li>
            <strong>Body weight.</strong> FitSync uses the latest weight recorded each day so you
            can follow changes over time.
          </li>
        </ul>
        <p className="mt-4">
          The app imports daily readings for the past seven days while you use it or when you return
          to it. Permissions are read-only. Your original Health Connect records stay under your
          control.
        </p>
      </section>
      <section>
        <h2>Where your readings go</h2>
        <p>
          FitSync stores the imported daily values in your progress journal on your device and syncs
          them to your signed-in account on our server. These values power your check-ins, history
          and trends. FitSync does not sell them or use them for advertising. Our{" "}
          <Link href="/privacy#health-connect">Privacy Policy</Link> explains storage, service
          providers, retention and your choices.
        </p>
      </section>
      <section>
        <h2>Choose or withdraw access</h2>
        <p>
          In the Android app, open Profile → Connected health and tap Connect Health Connect. Select
          the readings you want to allow. To change that selection later, open the same screen and
          tap Manage device permissions.
        </p>
        <p>
          To pause imports for your FitSync account, tap Stop importing for this account. You can
          also revoke FitSync’s read permissions in Health Connect. Previously imported readings
          stay in FitSync until you take action on those records.
        </p>
      </section>
      <section>
        <h2>Correct or remove imported readings</h2>
        <p>
          In Progress, open the metric and select a recorded day to edit or clear its current value.
          Your journal keeps earlier revisions, including cleared entries. To request removal of
          specific data or delete your account and its journal, see{" "}
          <Link href="/delete-account">FitSync account and data deletion</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
