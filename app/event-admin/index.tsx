import { Redirect } from 'expo-router';

export default function EventAdminIndex() {
  return <Redirect href="/event-admin/tabs/dashboard" />;
}
