import ActivityAdmin from "@/components/admin/activities/activity-admin";

// DashboardLayout đã kiểm tra quyền Admin; API vẫn kiểm tra quyền độc lập.
export default function AdminActivitiesPage() {
  return <ActivityAdmin />;
}
