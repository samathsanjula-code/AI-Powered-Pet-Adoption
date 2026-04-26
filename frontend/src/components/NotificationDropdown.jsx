import { useState, useEffect, useRef } from 'react'
import { API_BASE } from '../api'
import './NotificationDropdown.css'

function NotificationDropdown({ userId }) {
    const [notifications, setNotifications] = useState([])
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    useEffect(() => {
        if (userId) {
            fetchNotifications()
            // Poll every 30 seconds
            const interval = setInterval(fetchNotifications, 30000)
            return () => clearInterval(interval)
        }
    }, [userId])

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/${userId}`)
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const markAsRead = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PUT' })
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
            }
        } catch (e) {}
    }

    const clearAll = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/notifications/${userId}`, { method: 'DELETE' })
            if (res.ok) setNotifications([])
        } catch (e) {}
    }

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="notification-wrapper" ref={dropdownRef}>
            <button 
                type="button" 
                className={`notification-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="bell-icon">🔔</span>
                {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                            <button className="clear-btn" onClick={clearAll}>Clear All</button>
                        )}
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="no-notifications">No notifications yet</div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    className={`notification-item ${n.read ? 'read' : 'unread'}`}
                                    onClick={() => markAsRead(n.id)}
                                >
                                    <p className="notif-msg">{n.message}</p>
                                    <span className="notif-time">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default NotificationDropdown
