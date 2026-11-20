import { ProfileForm } from "@/components/profile";
import { DeleteAccountForm } from "@/components/delete-account-form";
export default function Page() {
  return (
    <>
      <ProfileForm settings />
      <DeleteAccountForm />
    </>
  );
}
