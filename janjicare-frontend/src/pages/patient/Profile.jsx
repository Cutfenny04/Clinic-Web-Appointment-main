import SidebarLayout from "@/layouts/SidebarLayout";
import { PageHeader } from "@/components/ui";
import { ProfileForm, PasswordForm } from "@/components/shared/ProfileSettings";

export default function PatientProfile() {
  return (
    <SidebarLayout>
      <PageHeader title="Profil Saya" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6"><ProfileForm /><PasswordForm /></div>
    </SidebarLayout>
  );
}
