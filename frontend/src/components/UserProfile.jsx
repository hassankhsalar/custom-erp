import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Camera, Save, UserCircle2 } from "lucide-react";
import { API_ROUTES, MEDIA_BASE_URL } from "../config";
import { useAuth } from "../context/AuthContext";

const UserProfile = () => {
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    image: "",
  });

  const token = localStorage.getItem("token");

  const imageUrl = useMemo(() => {
    if (!form.image) return "";
    if (form.image.startsWith("http")) return form.image;
    if (form.image.startsWith("/uploads")) return `${MEDIA_BASE_URL}${form.image}`;
    return `${MEDIA_BASE_URL}/uploads/${form.image}`;
  }, [form.image]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await axios.get(API_ROUTES.PROFILE, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(res.data);
        setForm({
          name: res.data?.name || "",
          bio: res.data?.profile?.bio || "",
          image: res.data?.profile?.image || "",
        });
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleUpload = async (file) => {
    if (!file) return;
    if (!token) {
      setError("Authentication required.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API_ROUTES.UPLOADS}/profile`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setForm((prev) => ({ ...prev, image: res.data.imageUrl || "" }));
    } catch (e) {
      setError(e.response?.data?.error || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await axios.put(
        API_ROUTES.PROFILE,
        {
          name: form.name,
          bio: form.bio,
          image: form.image || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setProfile(res.data);
      setSuccess("Profile updated successfully.");
      localStorage.setItem("name", res.data?.name || "");
      await refetch?.();
    } catch (e) {
      setError(e.response?.data?.error || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto bg-white/60 border border-white/50 rounded-2xl p-8">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 rounded-t-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto">
        <div className="backdrop-blur-xl bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600 mt-1">Update your personal information and profile image.</p>
        </div>

        <form onSubmit={handleSave} className="backdrop-blur-lg bg-white/40 border border-white/60 rounded-2xl shadow-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="w-44 h-44 rounded-2xl border border-gray-200 overflow-hidden bg-white flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 size={96} className="text-gray-300" />
                )}
              </div>
              <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 cursor-pointer">
                <Camera size={16} />
                {uploading ? "Uploading..." : "Change Image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </label>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  value={profile?.email || ""}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  value={profile?.username || ""}
                  disabled
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white/80"
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {success && <p className="mt-4 text-sm text-emerald-600">{success}</p>}

          <div className="mt-6">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-70"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserProfile;
