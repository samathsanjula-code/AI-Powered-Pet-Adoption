import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../api'
import './ProfilePage.css'

const DEFAULT_USER_IMAGE = 'https://cdn-icons-png.flaticon.com/512/149/149071.png'

function ProfilePage() {
    const { user, login } = useAuth()
    const fileInputRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [previewUrl, setPreviewUrl] = useState(null); // අලුතින් එකතු කළා preview එක පෙන්වන්න

    const [formData, setFormData] = useState({
        name: user?.name || '',
        phoneNumber: user?.phoneNumber || '',
        addressLine1: user?.addressLine1 || '',
        addressLine2: user?.addressLine2 || '',
        city: user?.city || '',
        image: null,
        removeImage: false // Image එක අයින් කරන්න ඕනෙද කියලා බලන්න
    })

    const [pets, setPets] = useState([])
    const [fetchingPets, setFetchingPets] = useState(false)
    const [editingPetId, setEditingPetId] = useState(null)
    const [editPetForm, setEditPetForm] = useState({})

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                phoneNumber: user.phoneNumber || '',
                addressLine1: user.addressLine1 || '',
                addressLine2: user.addressLine2 || '',
                city: user.city || '',
                image: null,
                removeImage: false
            });
            setPreviewUrl(null);
            fetchUserPets();
        }
    }, [user]);

    const fetchUserPets = async () => {
        if (!user?.id) {
            console.log('No user ID found, skipping fetch');
            return
        }
        setFetchingPets(true)
        console.log('Fetching pets for user ID:', user.id);
        try {
            const res = await fetch(`${API_BASE}/api/pets/user/${user.id}`)
            if (res.ok) {
                const data = await res.json()
                console.log('Fetched pets:', data);
                setPets(data)
            } else {
                console.error('Server returned error:', res.status);
            }
        } catch (e) {
            console.error('Failed to fetch user pets', e)
        } finally {
            setFetchingPets(false)
        }
    }

    const handleDeletePet = async (id) => {
        if (!window.confirm('Are you sure you want to delete this pet record?')) return
        try {
            const res = await fetch(`${API_BASE}/api/pets/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setPets(prev => prev.filter(p => p.id !== id))
                setMessage({ type: 'success', text: 'Pet deleted successfully' })
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to delete pet' })
        }
    }

    const startEditPet = (pet) => {
        setEditingPetId(pet.id)
        // Convert age months back to years/months for the form
        const m = Number(pet.ageMonths || 0)
        setEditPetForm({
            ...pet,
            ageYears: Math.floor(m / 12),
            ageMonths: m % 12,
            vaccinated: pet.vaccinated === 1 ? 'yes' : 'no',
            previousOwner: pet.previousOwner === 1 ? 'yes' : 'no'
        })
    }

    const handleSavePetEdit = async () => {
        try {
            const fd = new FormData()
            fd.append('registrationType', editPetForm.registrationType || 'Home Pet')
            fd.append('petType', editPetForm.petType || 'Dog')
            fd.append('breed', editPetForm.breed || '')
            fd.append('ageYears', String(editPetForm.ageYears || 0))
            fd.append('ageMonths', String(editPetForm.ageMonths || 0))
            fd.append('color', editPetForm.color || '')
            fd.append('size', editPetForm.size || 'Medium')
            fd.append('weightKg', String(editPetForm.weightKg || 1))
            fd.append('vaccinated', editPetForm.vaccinated)
            fd.append('healthCondition', editPetForm.healthCondition === 1 ? 'Healthy & Active' : 'Needs Care')
            fd.append('previousOwner', editPetForm.previousOwner)
            fd.append('contactName', editPetForm.contactName || '')
            fd.append('phoneNumber', editPetForm.phoneNumber || '')

            const res = await fetch(`${API_BASE}/api/pets/${editingPetId}`, {
                method: 'PUT',
                body: fd
            })

            if (res.ok) {
                const updated = await res.json()
                setPets(prev => prev.map(p => p.id === editingPetId ? updated : p))
                setEditingPetId(null)
                setMessage({ type: 'success', text: 'Pet details updated!' })
            } else {
                const err = await res.json()
                alert(err.message || 'Update failed')
            }
        } catch (e) {
            alert('Could not update pet')
        }
    }

    // Image එක UI එකට ගන්න logic එක
    const getProfileImage = () => {
        if (previewUrl) return previewUrl;
        if (user?.profileImage && !formData.removeImage) return `${API_BASE}${user.profileImage}`;
        return DEFAULT_USER_IMAGE;
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file, removeImage: false });
            setPreviewUrl(URL.createObjectURL(file));
        }
    }

    const handleRemovePhoto = () => {
        setFormData({ ...formData, image: null, removeImage: true });
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const handleUpdate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ type: '', text: '' })

        try {
            const data = new FormData()
            data.append('name', formData.name)
            data.append('phoneNumber', formData.phoneNumber)
            data.append('addressLine1', formData.addressLine1)
            data.append('addressLine2', formData.addressLine2)
            data.append('city', formData.city)
            data.append('removeImage', formData.removeImage)

            if (formData.image) {
                data.append('image', formData.image)
            }

            const res = await fetch(`${API_BASE}/api/users/${user.id}/profile`, {
                method: 'PUT',
                body: data
            })

            const updatedUser = await res.json()
            if (res.ok) {
                login(updatedUser)
                setPreviewUrl(null);
                setMessage({ type: 'success', text: 'Profile updated successfully!' })
            } else {
                setMessage({ type: 'error', text: updatedUser.message || 'Update failed' })
            }
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Could not connect to server' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="profile-container">
            <header className="profile-header">
                <Link to="/" className="back-link">← Back to Home</Link>
                <h1>My Profile</h1>
            </header>

            <main className="profile-main">
                <div className="profile-card">
                    <div className="profile-image-section">
                        <img src={getProfileImage()} alt="Profile" className="profile-preview" />

                        <div className="photo-actions">
                            <button type="button" className="change-photo-btn" onClick={() => fileInputRef.current.click()}>
                                Change Photo
                            </button>

                            {(user?.profileImage || previewUrl) && !formData.removeImage && (
                                <button type="button" className="remove-photo-btn" onClick={handleRemovePhoto}>
                                    Remove Photo
                                </button>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    <form onSubmit={handleUpdate} className="profile-form">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} placeholder="07xxxxxxxx" />
                        </div>

                        <div className="form-group">
                            <label>Address Line 1</label>
                            <input type="text" value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>Address Line 2</label>
                            <input type="text" value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                        </div>

                        {message.text && message.type === 'success' && !editingPetId && <p className="message success">{message.text}</p>}
                        {message.text && message.type === 'error' && !editingPetId && <p className="message error">{message.text}</p>}

                        <button type="submit" className="save-btn" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                <div className="userwise-pets-section">
                    <div className="userwise-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>My Registered Pets</h2>
                        <button type="button" onClick={fetchUserPets} className="refresh-btn" style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                            Refresh List
                        </button>
                    </div>
                    {fetchingPets ? (
                        <p>Loading your pets...</p>
                    ) : pets.length === 0 ? (
                        <p>You haven't registered any pets yet.</p>
                    ) : (
                        <div className="pets-table-wrap">
                            <table className="pets-table">
                                <thead>
                                    <tr>
                                        <th>Photo</th>
                                        <th>Breed</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pets.map(pet => (
                                        <tr key={pet.id}>
                                            <td>
                                                <img
                                                    src={pet.imagePaths?.[0] ? `${API_BASE}${pet.imagePaths[0]}` : 'https://via.placeholder.com/40'}
                                                    alt=""
                                                    className="pet-thumb"
                                                />
                                            </td>
                                            <td>{pet.breed}</td>
                                            <td>{pet.petType}</td>
                                            <td>{pet.registrationType}</td>
                                            <td>
                                                <div className="pet-actions">
                                                    <button className="btn-edit-pet" onClick={() => startEditPet(pet)}>Edit</button>
                                                    <button className="btn-delete-pet" onClick={() => handleDeletePet(pet.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {editingPetId && (
                        <div className="pet-edit-panel">
                            <h3>Editing Pet: {editPetForm.breed}</h3>
                            <div className="pet-edit-grid">
                                <label>Breed
                                    <input value={editPetForm.breed || ''} onChange={e => setEditPetForm({ ...editPetForm, breed: e.target.value })} />
                                </label>
                                <label>Pet Type
                                    <select value={editPetForm.petType || 'Dog'} onChange={e => setEditPetForm({ ...editPetForm, petType: e.target.value })}>
                                        <option value="Dog">Dog</option>
                                        <option value="Cat">Cat</option>
                                        <option value="Rabbit">Rabbit</option>
                                        <option value="Bird">Bird</option>
                                    </select>
                                </label>
                                <label>Age (Years)
                                    <input type="number" value={editPetForm.ageYears || 0} onChange={e => setEditPetForm({ ...editPetForm, ageYears: e.target.value })} />
                                </label>
                                <label>Age (Months)
                                    <input type="number" value={editPetForm.ageMonths || 0} onChange={e => setEditPetForm({ ...editPetForm, ageMonths: e.target.value })} />
                                </label>
                                <label>Color
                                    <input value={editPetForm.color || ''} onChange={e => setEditPetForm({ ...editPetForm, color: e.target.value })} />
                                </label>
                                <label>Weight (KG)
                                    <input type="number" value={editPetForm.weightKg || 0} onChange={e => setEditPetForm({ ...editPetForm, weightKg: e.target.value })} />
                                </label>
                                <label>Vaccinated
                                    <select value={editPetForm.vaccinated} onChange={e => setEditPetForm({ ...editPetForm, vaccinated: e.target.value })}>
                                        <option value="yes">Yes</option>
                                        <option value="no">No</option>
                                    </select>
                                </label>
                            </div>
                            <div className="pet-edit-actions">
                                <button className="cancel-pet-btn" onClick={() => setEditingPetId(null)}>Cancel</button>
                                <button className="save-pet-btn" onClick={handleSavePetEdit}>Save Changes</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default ProfilePage;