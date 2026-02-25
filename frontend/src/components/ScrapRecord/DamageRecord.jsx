import { useLocation } from "react-router-dom";
import DamageRecordList from "./DamageRecordList";
import AddDamageRecord from "./AddDamageRecord";
import { usePermission } from "../../hooks/usePermission";

export default function DamageRecord() {
  const location = useLocation();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("damage_create");
  const isCreateRoute = location.pathname.includes("/new");

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        {isCreateRoute && canCreate ? <AddDamageRecord /> : <DamageRecordList />}
      </div>
    </div>
  );
}
