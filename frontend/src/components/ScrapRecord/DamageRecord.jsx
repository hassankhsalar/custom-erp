import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, ClipboardList, Plus } from "lucide-react";
import DamageRecordList from "./DamageRecordList";
import AddDamageRecord from "./AddDamageRecord";
import { usePermission } from "../../hooks/usePermission";

export default function DamageRecord() {
  const location = useLocation();
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("damage_create");
  const defaultTab = location.pathname.includes("/new") && canCreate ? "create" : "list";
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="min-h-screen rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-2xl shadow-red-100/50 mb-6 p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-lg">
              <AlertTriangle className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Damage Record</h1>
              <p className="text-sm text-gray-600">Create and manage mixed product/material damage records.</p>
            </div>
          </div>
          <div className="mt-4 inline-flex rounded-xl bg-white/70 border border-gray-200 p-1 gap-1">
          <button
            onClick={() => setTab("list")}
            className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${tab === "list" ? "bg-red-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}
          >
            <ClipboardList size={14} /> All Damage
          </button>
          {canCreate ? (
            <button
              onClick={() => setTab("create")}
              className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 ${tab === "create" ? "bg-red-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            >
              <Plus size={14} /> New Damage
            </button>
          ) : null}
        </div>
        </div>

        {tab === "create" && canCreate ? <AddDamageRecord /> : <DamageRecordList />}
      </div>
    </div>
  );
}
