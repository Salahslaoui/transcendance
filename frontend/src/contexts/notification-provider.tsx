"use client";
import React, { useState, useContext } from "react";
import Notification, { NotificationProps } from "@/components/ui/notification";

type NotificationWithId = NotificationProps & { id: number };

type ShowNotificationFn = (props: NotificationProps) => void;
type HideNotificationFn = (id: number) => void;
type HideAllNotificationsFn = () => void;

export type NotificationContextType = {
  showNotification: ShowNotificationFn;
  hideNotification: HideNotificationFn;
  hideAllNotifications: HideAllNotificationsFn;
};

const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export default function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);

  const showNotification: ShowNotificationFn = (props) => {
    setNotifications((prev) => {
      const id = prev.length > 0 ? prev[prev.length - 1].id + 1 : 0;
      const newNotification = { ...props, id };
      return [...prev, newNotification];
    });
  };

  const hideNotification: HideNotificationFn = (id) => {
    setTimeout(() => {
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    }, 200);
  };

  const hideAllNotifications: HideAllNotificationsFn = () => {
    setNotifications([]);
  }

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, hideAllNotifications}}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
        {notifications.map((notif) => (
          <Notification
            key={notif.id}
            {...notif}
            onClose={() => hideNotification(notif.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useShowNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useShowNotification must be used within a NotificationProvider");
  }
  return context.showNotification;
}

export function useHideAllNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("hideAllNotifications must be used within a NotificationProvider");
  }
  return context.hideAllNotifications;
}