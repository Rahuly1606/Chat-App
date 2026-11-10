import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Filter, MessageCircle, Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore();
  const { onlineUsers = [] } = useAuthStore(); // Default to an empty array if undefined
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [showFilterOptions, setShowFilterOptions] = useState(false);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-full sm:w-80 lg:w-96 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-5 text-primary" />
            <span className="font-medium text-lg">Chats</span>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowFilterOptions(!showFilterOptions)}
            className="btn btn-sm btn-circle"
            aria-label="Toggle user filters"
            aria-expanded={showFilterOptions}
          >
            <Filter size={18} className={showOnlineOnly ? "text-primary" : ""} />
          </button>
        </div>

        {/* Filters - Now toggleable on mobile */}
        {showFilterOptions && (
          <div className="mt-3 flex items-center gap-2 animate-fadeIn">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online users only</span>
            </label>
            <span className="text-xs text-base-content/60">({onlineUsers.length} online)</span>
          </div>
        )}
      </div>

      {/* User list container - with proper scrolling */}
      <div className="flex-1 overflow-y-auto w-full py-2">
        <div className="pb-2">
          {filteredUsers.map((user) => (
            <button
              key={user._id}
              onClick={() => setSelectedUser(user)}
              className={`
                w-[calc(100%_-_1rem)] py-3 px-4 flex items-center gap-3
                hover:bg-base-300 transition-colors rounded-lg mx-2 my-1
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
              `}
            >
              <div className="relative">
                <img
                  src={user.profilePic || "/avatar.jpg"}
                  alt={user.fullName}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-green-500 
                    rounded-full ring-2 ring-base-100"
                    aria-label="Online"
                  />
                )}
              </div>

              {/* User info - visible on all screen sizes now */}
              <div className="text-left min-w-0 flex-1">
                <div className="font-medium truncate">{user.fullName}</div>
                <div className="text-sm text-base-content/60 flex items-center gap-1">
                  {onlineUsers.includes(user._id) ? (
                    <>
                      <span className="size-2 bg-green-500 rounded-full inline-block"></span>
                      <span>Online</span>
                    </>
                  ) : (
                    "Offline"
                  )}
                </div>
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center text-base-content/60 py-8">
              <Users className="size-12 mx-auto mb-3 opacity-20" />
              <p>No users found</p>
              {showOnlineOnly && (
                <button
                  onClick={() => setShowOnlineOnly(false)}
                  className="btn btn-sm btn-outline mt-2"
                >
                  Show all users
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
