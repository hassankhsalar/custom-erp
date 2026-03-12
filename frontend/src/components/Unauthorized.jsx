import { X } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="flex items-center justify-center flex-col h-screen bg-gray-100">
        <div className="p-4 h-20 w-20 bg-red-100 rounded-full flex items-center justify-center">
          <X className="text-red-500 w-16 h-16" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Unauthorized</h1>
        <p className="text-lg">You do not have permission to access this page.</p>
    </div>
  );
}