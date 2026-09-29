import React, { useEffect, useState } from "react";
import { User } from "@/helpers/types";
import { SecurityCheck } from "@/helpers/types";
import { makeRequest } from "@/helpers/api";

export default function Blocked({ setError, setSuccess }: SecurityCheck) {
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      const response = await makeRequest(
        "/relationships/friends/list?blocked=true",
        { auth: true }
      );

      if (response.success && response.details!.users) {
        setBlockedUsers(response.details!.users);
      } else {
        setError(
          "Unable to fetch blocked users currently, please try again later"
        );
      }

      setLoading(false);
    };

    fetchBlockedUsers();
  }, []);

  const handleUnblock = async (id: number) => {
    const response = await makeRequest(`/relationships/friends/unblock/${id}`, {
      method: "POST",
      auth: true,
    });

    if (response.success) {
      setSuccess("User unblocked.");
      setBlockedUsers(prev => prev.filter(u => u.id !== id));
    } else {
      setError("Failed to unblock user. Please try again later.");
    }
  };

  return (
    <div className="space-y-6 px-8 py-6 rounded-2xl shadow-inner flex-1 overflow-y-auto 
                    scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-gray-900 
                    border border-gray-800/30">
      <h2 className="text-2xl font-bold text-blue-300 mb-4 text-left">
        Blocked Users
      </h2>
      <hr className="border-blue-800 mb-6" />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            Here's a list of the users you blocked
          </h3>
          <p className="text-sm text-gray-400">
            You can unblock anyone, they will be restored to your friend list!
          </p>
        </div>
      </div>

      {loading && <p className="text-gray-400 mt-4">Loading...</p>}

      {!loading && blockedUsers.length === 0 && (
        <p className="text-gray-400 mt-4">You have not blocked anyone.</p>
      )}

      <div className="space-y-4 max-h-[60vh] overflow-y-auto 
                      pr-2 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-gray-800">
        {blockedUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between 
                       bg-gray-800/40 px-4 py-3 rounded-xl border border-gray-700/40"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-gray-300 text-lg">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
              <p className="text-white font-medium">{user.username}</p>
            </div>

            <button
              onClick={() => handleUnblock(user.id)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold
                         bg-red-600 hover:bg-red-700 transition-colors"
            >
              Unblock
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
