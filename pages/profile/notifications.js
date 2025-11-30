import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TopNavBar from '../../components/TopNavBar';
import ProfileLayout from '../../components/ProfileLayout';
import s from '@/styles/profile-edit.module.css';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchNotifications = async () => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const deleteNotification = async (notificationId) => {
    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        // Remove from local state
        setNotifications(notifications.filter(n => n._id !== notificationId));
      } else {
        alert('Failed to delete notification');
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      alert('Failed to delete notification');
    }
  };

  const viewPost = (postId) => {
    if (!postId) {
      alert('Post ID not available');
      return;
    }
    router.push(`/posts/${postId}`);
  };

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;

    const token = localStorage.getItem('userToken');
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        // Clear local state
        setNotifications([]);
      } else {
        alert('Failed to clear notifications');
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      alert('Failed to clear notifications');
    }
  };

  return (
    <>
      <TopNavBar />
      <ProfileLayout>
        <div className={s.page}>
          <div className={s.wrap}>
            <section className={s.card}>
              <div className={s.cardHead} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                    title="Clear all notifications"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className={s.cardBody} style={{ gridTemplateColumns: '1fr' }}>
                <main>
                  {loading ? (
                    <p>Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <h4>No notifications.</h4>
                  ) : (
                    <div>
                      {notifications.map((notification) => (
                        <div key={notification._id} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px', borderRadius: '5px', position: 'relative' }}>
                          <p>{notification.message}</p>
                          <small style={{ color: '#666' }}>{new Date(notification.createdAt).toLocaleString()}</small>
                          <div style={{ position: 'absolute', top: '50%', right: '10px', transform: 'translateY(-50%)', display: 'flex', gap: '5px' }}>
                            <button
                              onClick={() => viewPost(notification.postId)}
                              style={{
                                background: notification.postId ? '#007bff' : '#ccc',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: notification.postId ? 'pointer' : 'not-allowed',
                                fontSize: '12px'
                              }}
                              title={notification.postId ? "View post" : "Post ID not available"}
                              disabled={!notification.postId}
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteNotification(notification._id)}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                              title="Delete notification"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </main>
              </div>
            </section>
          </div>
        </div>
      </ProfileLayout>
    </>
  );
}
